import crypto from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { verifyMessage, getAddress } from 'viem';
import { db, mapUser } from '../db.ts';
import { requireAuth } from '../middleware/auth.ts';
import { hashPassword, signSessionToken, verifyPassword } from '../utils/crypto.ts';

export const authRouter = Router();

function setSessionCookie(req: Request, res: Response, token: string) {
  const isHttps =
    req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie('boyang_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: '/',
  });
}

authRouter.get('/me', (req, res) => {
  res.json({ user: req.user || null });
});

authRouter.post('/register', (req, res) => {
  const { name, email, password, phone } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nama, email, dan password wajib diisi.' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password minimal 6 karakter.' });
  }

  const exists = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(normalizedEmail);
  if (exists) {
    return res.status(409).json({ error: 'Email sudah terdaftar. Silakan masuk.' });
  }

  const userId = 'usr-' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, phone, created_at)
     VALUES (?, ?, ?, ?, 'USER', ?, ?)`
  ).run(
    userId,
    String(name).trim(),
    normalizedEmail,
    hashPassword(String(password)),
    phone ? String(phone).trim() : null,
    now
  );

  const row = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(userId) as Record<string, unknown>;
  const user = mapUser(row);
  const token = signSessionToken({ uid: user.id, role: user.role });
  setSessionCookie(req, res, token);

  res.status(201).json({ user, token });
});

authRouter.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const row = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(normalizedEmail) as Record<string, unknown> | undefined;

  if (!row || !verifyPassword(String(password), String(row.password_hash))) {
    return res.status(401).json({ error: 'Email atau password tidak sesuai.' });
  }

  const user = mapUser(row);
  const token = signSessionToken({ uid: user.id, role: user.role });
  setSessionCookie(req, res, token);

  res.json({ user, token });
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie('boyang_session', { path: '/' });
  res.json({ ok: true });
});

authRouter.patch('/profile', requireAuth, (req, res) => {
  const { name, phone, newPassword } = req.body || {};
  const userId = req.user!.id;

  if (name) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(
      String(name).trim(),
      userId
    );
  }
  if (phone !== undefined) {
    db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(
      phone ? String(phone).trim() : null,
      userId
    );
  }
  if (newPassword) {
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
    }
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
      hashPassword(String(newPassword)),
      userId
    );
  }

  const updated = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(userId) as Record<string, unknown>;
  res.json({ user: mapUser(updated) });
});

authRouter.post('/web3/nonce', (req, res) => {
  const { walletAddress } = req.body || {};
  if (!walletAddress) {
    return res.status(400).json({ error: 'Alamat wallet wajib disertakan.' });
  }
  let checksumAddress: string;
  try {
    checksumAddress = getAddress(String(walletAddress));
  } catch {
    return res.status(400).json({ error: 'Format alamat wallet EVM tidak valid.' });
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  const expiresAt = Date.now() + 1000 * 60 * 10; // 10 minutes
  db.prepare('DELETE FROM web3_nonces WHERE expires_at < ?').run(Date.now());
  db.prepare(
    'INSERT INTO web3_nonces (nonce, wallet_address, expires_at) VALUES (?, ?, ?)'
  ).run(nonce, checksumAddress.toLowerCase(), expiresAt);

  const message = [
    'BOYANG DIGITAL - Web3 Authentication & Wallet Binding',
    `Wallet: ${checksumAddress}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
    'Penandatanganan ini GRATIS (tanpa gas fee) untuk membuktikan kepemilikan wallet.',
  ].join('\n');

  res.json({ nonce, message, walletAddress: checksumAddress });
});

authRouter.post('/web3/verify', async (req, res) => {
  const { walletAddress, signature, nonce, message } = req.body || {};
  if (!walletAddress || !signature || !nonce || !message) {
    return res.status(400).json({ error: 'Data verifikasi Web3 tidak lengkap.' });
  }

  let checksumAddress: string;
  try {
    checksumAddress = getAddress(String(walletAddress));
  } catch {
    return res.status(400).json({ error: 'Alamat wallet tidak valid.' });
  }

  const lowerAddress = checksumAddress.toLowerCase();
  const nonceRow = db
    .prepare(
      'SELECT * FROM web3_nonces WHERE nonce = ? AND wallet_address = ? AND expires_at > ?'
    )
    .get(String(nonce), lowerAddress, Date.now()) as Record<string, unknown> | undefined;

  if (!nonceRow) {
    return res.status(400).json({ error: 'Nonce Web3 kadaluarsa atau tidak valid.' });
  }

  try {
    const valid = await verifyMessage({
      address: checksumAddress as `0x${string}`,
      message: String(message),
      signature: String(signature) as `0x${string}`,
    });

    if (!valid) {
      return res.status(401).json({ error: 'Signature kriptografi wallet tidak valid.' });
    }
  } catch {
    return res.status(401).json({ error: 'Gagal memverifikasi signature wallet.' });
  }

  db.prepare('DELETE FROM web3_nonces WHERE nonce = ?').run(String(nonce));

  // If already logged in, bind wallet to current account
  if (req.user) {
    const existingOwner = db
      .prepare('SELECT id FROM users WHERE wallet_address = ? AND id != ?')
      .get(lowerAddress, req.user.id);
    if (existingOwner) {
      return res.status(409).json({
        error: 'Wallet ini sudah terhubung dengan akun Boyang Digital lain.',
      });
    }
    db.prepare('UPDATE users SET wallet_address = ? WHERE id = ?').run(
      lowerAddress,
      req.user.id
    );
    const updated = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(req.user.id) as Record<string, unknown>;
    return res.json({ user: mapUser(updated), mode: 'bound' });
  }

  // Otherwise sign in or create Web3 account
  let userRow = db
    .prepare('SELECT * FROM users WHERE wallet_address = ?')
    .get(lowerAddress) as Record<string, unknown> | undefined;

  if (!userRow) {
    const userId = 'usr-w3-' + crypto.randomBytes(5).toString('hex');
    const shortWallet = `${checksumAddress.slice(0, 6)}...${checksumAddress.slice(-4)}`;
    db.prepare(
      `INSERT INTO users (id, name, email, password_hash, role, wallet_address, created_at)
       VALUES (?, ?, ?, ?, 'USER', ?, ?)`
    ).run(
      userId,
      `Web3 Member (${shortWallet})`,
      `${lowerAddress.slice(2, 10)}@web3.boyangdigital.id`,
      hashPassword(crypto.randomBytes(24).toString('hex')),
      lowerAddress,
      new Date().toISOString()
    );
    userRow = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(userId) as Record<string, unknown>;
  }

  const user = mapUser(userRow);
  const token = signSessionToken({ uid: user.id, role: user.role });
  setSessionCookie(req, res, token);

  res.json({ user, token, mode: 'login' });
});

authRouter.post('/web3/unlink', requireAuth, (req, res) => {
  db.prepare('UPDATE users SET wallet_address = NULL, ens_name = NULL WHERE id = ?').run(
    req.user!.id
  );
  const updated = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(req.user!.id) as Record<string, unknown>;
  res.json({ user: mapUser(updated) });
});
