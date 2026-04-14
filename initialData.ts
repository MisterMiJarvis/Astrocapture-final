
import { AppData } from './types';

// FIX: Completed the INITIAL_DATA object to match the AppData type and provide default content.
export const INITIAL_DATA: AppData = {
  version: '3.1.0-Slider',
  logoUrl: 'https://www.nasa.gov/wp-content/uploads/2023/08/stsci-01h8x6x79r6f1h0g9y8c99t2tr.png',
  faviconUrl: 'https://www.nasa.gov/wp-content/uploads/2023/08/stsci-01h8x6x79r6f1h0g9y8c99t2tr.png',
  
  heroSlides: [
    {
      id: 'slide-1',
      title: 'The Great Orion Nebula',
      subtitle: 'A Stellar Nursery in Our Galactic Backyard',
      description: 'M42 is one of the brightest nebulae in the sky, a vast cloud of gas and dust where new stars are born. Explore this stunning deep-sky object in high resolution.',
      imageUrl: 'https://www.nasa.gov/wp-content/uploads/2024/01/stsci-01hm19aqe10n7v05s08fsfs1hp.png',
      linkText: 'View The Post',
      linkUrl: 'post:m42-orion-nebula',
    },
    {
      id: 'slide-2',
      title: 'Andromeda Galaxy',
      subtitle: 'Our Closest Galactic Neighbor',
      description: "Discover the majestic spiral arms of M31, the Andromeda Galaxy. It's on a collision course with the Milky Way, but you can see the stunning details today.",
      imageUrl: 'https://www.nasa.gov/wp-content/uploads/2023/05/pia15416-andromeda-galaxy.jpg',
      linkText: 'Explore M31',
      linkUrl: 'post:m31-andromeda-galaxy',
    }
  ],
  
  processingConfig: {
    title: 'Articles & Tutorials',
    subtitle: 'From Raw Data to Final Image',
    introParagraph: 'This section is dedicated to the art and science of astrophotography. Here you will find in-depth articles, tutorials, and breakdowns of how images are brought to life, from capture to final processing.'
  },

  about: {
    title: 'About the Astronomer',
    subtitle: 'From City Lights to Starlight',
    imageUrl: 'https://live.staticflickr.com/3268/2921535445_1955364504_b.jpg',
    bio: `Ever since I was young, I've been captivated by the night sky. What started with a small department store telescope has grown into a lifelong passion for astronomy and astrophotography.\n\nThis portfolio is a showcase of my journey. Each image represents hours of patience, dedication, and a deep appreciation for the vast, beautiful universe we are a part of. My goal is to share the wonders of the cosmos and inspire others to look up.`,
    gear: [
      'Telescope: Celestron EdgeHD 8"',
      'Mount: Sky-Watcher EQ6-R Pro',
      'Primary Camera: ZWO ASI294MC Pro',
      'Guide Camera: ZWO ASI120MM Mini',
      'Filters: Optolong L-Pro, Optolong L-eNhance',
    ],
  },

  footer: {
    text: 'A personal collection of astrophotography. All images are captured and processed by the site owner unless otherwise noted.',
    socialLinks: {
      instagram: 'https://instagram.com',
      twitter: 'https://twitter.com',
      facebook: '',
      youtube: '',
    },
  },
  
  license: {
    title: 'Content License (Creative Commons Zero)',
    content: `To the extent possible under law, the person who associated CC0 with this work has waived all copyright and related or neighboring rights to this work.\n\nThis work is published from: The Internet.`
  },
  
  legalNotice: {
    title: 'Legal Notice',
    content: `## Legal Information\n\n**Site Owner:**\n[Your Name/Company]\n[Address]\n[City, State, Zip]\n[Country]\n\n**Contact:**\nEmail: [your.email@example.com]\nPhone: [Your Phone Number]\n\n**Disclaimer:**\nThe content of this website has been created with the utmost care. However, we cannot guarantee the contents' accuracy, completeness, or topicality. As a service provider, we are responsible for our own content on these pages according to general laws.\n\n**Copyright:**\nThe content and works on these pages created by the site operators are subject to copyright law. Duplication, processing, distribution, or any form of commercialization of such material beyond the scope of the copyright law shall require the prior written consent of its respective author or creator.`
  },

  cookieBanner: {
    enabled: true,
    title: 'We use cookies',
    message: 'This website uses cookies to ensure you get the best experience on our website. By continuing to use this site, you agree to our use of cookies.',
    acceptButtonText: 'Accept',
    declineButtonText: 'Decline'
  },
  
  posts: [
    {
      id: 'm42-orion-nebula',
      title: 'The Great Orion Nebula',
      objectName: 'M42',
      imageUrl: 'https://www.nasa.gov/wp-content/uploads/2024/01/stsci-01hm19aqe10n7v05s08fsfs1hp.png',
      captureDate: '2023-11-15',
      equipment: 'Celestron EdgeHD 8", ZWO ASI294MC Pro',
      description: 'The Orion Nebula is a stellar nursery, a vast cloud of gas and dust where new stars are being born. Located in the constellation of Orion, it is one of the brightest nebulae and is visible to the naked eye.',
      tags: ['nebula', 'orion', 'emission-nebula', 'winter'],
      astrobinUrl: 'https://www.astrobin.com/search/?q=M42',
      rawDataUrl: '',
      acquisitionLogs: [
        { id: '1', date: '2023-11-15', filter: 'L-eNhance', exposureCount: 60, exposureLength: 180 },
      ],
      totalIntegrationTime: 180,
      showOnWall: true,
    },
    {
      id: 'm31-andromeda-galaxy',
      title: 'Andromeda Galaxy',
      objectName: 'M31',
      imageUrl: 'https://www.nasa.gov/wp-content/uploads/2023/05/pia15416-andromeda-galaxy.jpg',
      captureDate: '2023-09-22',
      equipment: 'Celestron EdgeHD 8", ZWO ASI294MC Pro',
      description: "The Andromeda Galaxy is our closest major galactic neighbor. A spiral galaxy approximately 2.5 million light-years from Earth, it's on a collision course with our own Milky Way, but not for another 4.5 billion years.",
      tags: ['galaxy', 'andromeda', 'spiral-galaxy', 'autumn'],
      astrobinUrl: 'https://www.astrobin.com/search/?q=M31',
      rawDataUrl: 'https://storage.googleapis.com/astro-portfolio-assets/sample-raw-data.zip',
      acquisitionLogs: [
        { id: '1', date: '2023-09-22', filter: 'L-Pro', exposureCount: 120, exposureLength: 120 },
      ],
      totalIntegrationTime: 240,
      showOnWall: true,
    },
    {
      id: 'm16-eagle-nebula',
      title: 'Pillars of Creation',
      objectName: 'M16',
      imageUrl: 'https://www.nasa.gov/wp-content/uploads/2023/11/stsci-01hfetbxbgt82x30s0vt0q8y1q.png',
      captureDate: '2023-07-04',
      equipment: 'Celestron EdgeHD 8", ZWO ASI294MC Pro',
      description: 'The Eagle Nebula contains the famous "Pillars of Creation," towering columns of interstellar gas and dust. This iconic structure, popularized by the Hubble Space Telescope, is a region of active star formation.',
      tags: ['nebula', 'serpens', 'emission-nebula', 'summer'],
      astrobinUrl: 'https://www.astrobin.com/search/?q=M16',
      rawDataUrl: '',
      acquisitionLogs: [
        { id: '1', date: '2023-07-04', filter: 'L-eNhance', exposureCount: 45, exposureLength: 240 },
        { id: '2', date: '2023-07-05', filter: 'L-eNhance', exposureCount: 45, exposureLength: 240 },
      ],
      totalIntegrationTime: 360,
      showOnWall: true,
    },
  ],
  processingPosts: [
    {
      id: 'sample-processing-post',
      title: 'Sample: Stretching Nebula Data',
      postType: 'before-after',
      beforeImageUrl: 'https://www.nasa.gov/wp-content/uploads/2023/11/stsci-01hfetbxbgt82x30s0vt0q8y1q.png',
      afterImageUrl: 'https://esahubble.org/media/archives/images/large/heic1501a.jpg',
      description: 'This is a sample article demonstrating the before/after image feature. Hover over the main image to see the change, and click to open a larger view with toggles. Edit this in the CMS!',
      tags: ['pixinsight', 'tutorial', 'nebula'],
      captureDate: '2024-01-01',
      showBeforeOnWall: true,
      showAfterOnWall: true,
    },
    {
      id: 'sample-research-post',
      title: 'Deep Dive: The Chemistry of Star Formation',
      postType: 'research',
      featuredImageUrl: 'https://www.nasa.gov/wp-content/uploads/2023/05/pia15416-andromeda-galaxy.jpg',
      description: '<h2>Understanding Nebulae</h2><p>Star-forming regions, or nebulae, are vast clouds of gas and dust. This article explores the intricate chemical processes that lead to stellar ignition.</p><ul><li>Ionized Hydrogen</li><li>Molecular Clouds</li><li>Gravitational Collapse</li></ul><p>Listen to our accompanying podcast for more details!</p>',
      tags: ['research', 'nebula', 'chemistry', 'podcast'],
      captureDate: '2024-02-15',
      attachedAudioUrl: 'https://storage.googleapis.com/astro-portfolio-assets/sample-audio.mp3',
      attachedDocumentUrl: 'https://storage.googleapis.com/astro-portfolio-assets/sample-document.pdf',
      showFeaturedOnWall: true,
    },
    {
      id: 'sample-gallery-post',
      title: 'A Tour of the Carina Nebula',
      postType: 'gallery',
      description: '<h2>Cosmic Cliffs</h2><p>This gallery provides several different views and details of the vast Carina Nebula (NGC 3372), one of the largest and brightest nebulae in the night sky. It is home to some of the most massive and luminous stars in our Milky Way galaxy.</p>',
      tags: ['gallery', 'nebula', 'carina', 'jwst'],
      captureDate: '2024-03-20',
      galleryImages: [
        { id: 'img1', imageUrl: 'https://www.nasa.gov/wp-content/uploads/2023/04/stsci-01gwx283bbffexf741px9g8k9v.png', caption: 'A wide-field view showcasing the entire nebula.', showOnWall: true },
        { id: 'img2', imageUrl: 'https://www.nasa.gov/wp-content/uploads/2023/04/stsci-01gwx28m7b8q3bqqt9s11g2k49.png', caption: 'Close-up of the "Cosmic Cliffs" region.', showOnWall: true },
        { id: 'img3', imageUrl: 'https://www.nasa.gov/wp-content/uploads/2023/11/stsci-01hfetdgj9ea10pk23hkv9dtf7.png', caption: 'Detail of the Keyhole Nebula within Carina.', showOnWall: true }
      ]
    }
  ],
};