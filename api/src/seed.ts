import db from './db.js';
import bcrypt from 'bcryptjs';

const now = new Date().toISOString();

// Seed admin user (only if no users exist)
const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
if (userCount === 0) {
  const id = crypto.randomUUID();
  const hash = await bcrypt.hash('admin123', 10);
  db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)').run(id, 'admin@astrocapture.org', hash);
  console.log('✅ Admin user created: admin@astrocapture.org / admin123');
} else {
  console.log('⏭️  Admin user already exists, skipping');
}

// Seed site config (only if empty)
const configCount = (db.prepare('SELECT COUNT(*) as count FROM site_config').get() as any).count;
if (configCount === 0) {
  // Hero slides
  db.prepare(`INSERT INTO site_config (id, data, updated_at) VALUES ('heroSlides', ?, ?)`).run(
    JSON.stringify({
      slides: [
        { id: '1', imageUrl: '/images/hero-default.jpg', title: 'AstroCapture', subtitle: 'Astrophotography Portfolio', description: 'Exploring the night sky one frame at a time', linkText: 'View Gallery', linkUrl: '/gallery' }
      ]
    }), now
  );

  // About
  db.prepare(`INSERT INTO site_config (id, data, updated_at) VALUES ('about', ?, ?)`).run(
    JSON.stringify({
      title: 'About', subtitle: 'The Story Behind the Lens',
      imageUrl: '/images/about-default.jpg',
      bio: 'Passionate astrophotographer capturing the wonders of the universe.',
      gear: ['Telescope', 'Camera', 'Mount']
    }), now
  );

  // Footer
  db.prepare(`INSERT INTO site_config (id, data, updated_at) VALUES ('footer', ?, ?)`).run(
    JSON.stringify({
      text: '© 2025 AstroCapture. All rights reserved.',
      socialLinks: { instagram: '', twitter: '', facebook: '', youtube: '' }
    }), now
  );

  // Global config
  db.prepare(`INSERT INTO site_config (id, data, updated_at) VALUES ('global', ?, ?)`).run(
    JSON.stringify({ version: '1.0.0', logoUrl: '', faviconUrl: '' }), now
  );

  // Processing config
  db.prepare(`INSERT INTO site_config (id, data, updated_at) VALUES ('processing', ?, ?)`).run(
    JSON.stringify({ title: 'Processing', subtitle: 'Before & After', introParagraph: 'See the transformation from raw data to final image.' }), now
  );

  // License
  db.prepare(`INSERT INTO site_config (id, data, updated_at) VALUES ('license', ?, ?)`).run(
    JSON.stringify({ title: 'License', content: 'All images are copyright of the photographer.' }), now
  );

  // Legal notice
  db.prepare(`INSERT INTO site_config (id, data, updated_at) VALUES ('legalNotice', ?, ?)`).run(
    JSON.stringify({ title: 'Legal Notice', content: '' }), now
  );

  // Cookie banner
  db.prepare(`INSERT INTO site_config (id, data, updated_at) VALUES ('cookieBanner', ?, ?)`).run(
    JSON.stringify({ enabled: true, title: 'Cookie Notice', message: 'This site uses cookies.', acceptButtonText: 'Accept', declineButtonText: 'Decline' }), now
  );

  console.log('✅ Site config seeded');
} else {
  console.log('⏭️  Site config already exists, skipping');
}

const postCount = (db.prepare('SELECT COUNT(*) as count FROM posts').get() as any).count;
console.log(`\n📊 Database status:`);
console.log(`   Posts: ${postCount}`);
console.log(`   Config entries: ${configCount}`);
console.log(`   Users: ${userCount}`);
console.log('\n✅ Seed complete');