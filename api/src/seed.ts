import db from './db.js';
import bcrypt from 'bcryptjs';

async function seed() {
  const now = new Date().toISOString();

  // Seed admin user (only if no users exist)
  const userRow = await db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  const userCount = parseInt(userRow.count);
  if (userCount === 0) {
    const id = crypto.randomUUID();
    const hash = await bcrypt.hash('admin123', 10);
    await db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)').run(id, 'admin@astrocapture.org', hash);
    console.log('✅ Admin user created: admin@astrocapture.org / admin123');
  } else {
    console.log('⏭️  Admin user already exists, skipping');
  }

  // Seed site config (only if empty)
  const configRow = await db.prepare('SELECT COUNT(*) as count FROM site_config').get() as any;
  const configCount = parseInt(configRow.count);
  if (configCount === 0) {
    // Hero slides
    await db.prepare(`INSERT INTO site_config (id, data, updated_at) VALUES ('heroSlides', ?, ?)`).run(
      JSON.stringify({
        slides: [
          { id: '1', imageUrl: '/images/hero-default.jpg', title: 'AstroCapture', subtitle: 'Astrophotography Portfolio', description: 'Exploring the night sky one frame at a time', linkText: 'View Gallery', linkUrl: '/gallery' }
        ]
      }), now
    );

    // About
    await db.prepare(`INSERT INTO site_config (id, data, updated_at) VALUES ('about', ?, ?)`).run(
      JSON.stringify({
        title: 'About', subtitle: 'The Story Behind the Lens',
        imageUrl: '/images/about-default.jpg',
        bio: 'Passionate astrophotographer capturing the wonders of the universe.',
        gear: ['Telescope', 'Camera', 'Mount']
      }), now
    );

    // Footer
    await db.prepare(`INSERT INTO site_config (id, data, updated_at) VALUES ('footer', ?, ?)`).run(
      JSON.stringify({
        text: '© 2025 AstroCapture. All rights reserved.',
        socialLinks: { instagram: '', twitter: '', facebook: '', youtube: '' }
      }), now
    );

    // Global config
    await db.prepare(`INSERT INTO site_config (id, data, updated_at) VALUES ('global', ?, ?)`).run(
      JSON.stringify({ version: '1.0.0', logoUrl: '', faviconUrl: '' }), now
    );

    // Processing config
    await db.prepare(`INSERT INTO site_config (id, data, updated_at) VALUES ('processing', ?, ?)`).run(
      JSON.stringify({ title: 'Processing', subtitle: 'Before & After', introParagraph: 'See the transformation from raw data to final image.' }), now
    );

    // License
    await db.prepare(`INSERT INTO site_config (id, data, updated_at) VALUES ('license', ?, ?)`).run(
      JSON.stringify({ title: 'License', content: 'All images are copyright of the photographer.' }), now
    );

    // Legal notice
    await db.prepare(`INSERT INTO site_config (id, data, updated_at) VALUES ('legalNotice', ?, ?)`).run(
      JSON.stringify({ title: 'Legal Notice', content: '' }), now
    );

    // Cookie banner
    await db.prepare(`INSERT INTO site_config (id, data, updated_at) VALUES ('cookieBanner', ?, ?)`).run(
      JSON.stringify({ enabled: true, title: 'Cookie Notice', message: 'This site uses cookies.', acceptButtonText: 'Accept', declineButtonText: 'Decline' }), now
    );

    console.log('✅ Site config seeded');
  } else {
    console.log('⏭️  Site config already exists, skipping');
  }

  const postRow = await db.prepare('SELECT COUNT(*) as count FROM posts').get() as any;
  const postCount = parseInt(postRow.count);
  console.log(`\n📊 Database status:`);
  console.log(`   Posts: ${postCount}`);
  console.log(`   Config entries: ${configCount}`);
  console.log(`   Users: ${userCount}`);
  console.log('\n✅ Seed complete');
}

seed().catch(console.error);