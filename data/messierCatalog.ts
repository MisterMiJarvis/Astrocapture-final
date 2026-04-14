export interface MessierObject {
    messier: string;
    ngc: string | null;
    objet: string;
    saison: string;
    mag: number;
    english_name_nom_en_anglais: string | null;
    french_name_nom_francais: string | null;
    latin_name_nom_latin: string | null;
    ra: string | null;
    dec: string | null;
    distance: number | null;
    dimension: string | null;
    decouvreur: string | null;
    annee: string | null;
    image: string;
    image_url: {
        thumbnail: boolean;
        filename: string;
        format: string;
        width: number;
        mimetype: string;
        id: string;
        last_synchronized: string;
        color_summary: string[];
        height: number;
        url: string;
    };
    const: string | null;
    // Enriched fields for UI
    difficulty?: 'Easy' | 'Medium' | 'Hard';
    commonName?: string;
    constellation?: string;
    type?: string;
    size?: string;
    bestSeason?: string;
}

export const MESSIER_CATALOG: MessierObject[] = [
    {
        "messier": "M99", "ngc": "NGC 4254", "objet": "Galaxy / Galaxie", "saison": "Spring / Printemps", "mag": 9, "english_name_nom_en_anglais": "Hair of Berenice", "french_name_nom_francais": "Chevelure de Bérénice", "latin_name_nom_latin": "Coma Berenices", "ra": "12:18:49.60", "dec": "+14:24:59.4", "distance": 41000000, "dimension": "5,4' x 4,8'", "decouvreur": "Méchain", "annee": "1781", "image": "http://www.lasam.ca/messier/M099.JPG", "image_url": {"thumbnail": true, "filename": "M099.JPG.jpe", "format": "JPEG", "width": 816, "mimetype": "image/jpeg", "id": "76a67bc41ee3e41b25567e06b20bab39", "last_synchronized": "2017-01-13T14:11:16.997967", "color_summary": ["rgba(242, 241, 241, 1.00)", "rgba(252, 251, 251, 1.00)", "rgba(248, 248, 248, 1.00)"], "height": 1054, "url": "https://data.smartidf.services/api/explore/v2.1/catalog/datasets/catalogue-de-messier/files/76a67bc41ee3e41b25567e06b20bab39"}, "const": "Com",
        "difficulty": "Hard", "commonName": "Coma Pinwheel", "constellation": "Coma Berenices", "type": "Galaxy", "size": "5.4' x 4.8'", "bestSeason": "Spring"
    },
    {
        "messier": "M94", "ngc": "NGC 4736", "objet": "Galaxy / Galaxie", "saison": "Spring / Printemps", "mag": 8, "english_name_nom_en_anglais": "Hound Dogs", "french_name_nom_francais": "Les Chiens de chasse", "latin_name_nom_latin": "Canes Venatici", "ra": "12:50:53.06", "dec": "+41:07:13.6", "distance": 32600000, "dimension": "11,0' x 9,1'", "decouvreur": "Méchain", "annee": "1781", "image": "http://www.lasam.ca/messier/M094.JPG", "image_url": {"thumbnail": true, "filename": "M094.JPG.jpe", "format": "JPEG", "width": 816, "mimetype": "image/jpeg", "id": "8c106b857bd4916cfc4712b82690df78", "last_synchronized": "2017-01-13T14:11:13.611568", "color_summary": ["rgba(241, 240, 240, 1.00)", "rgba(253, 252, 252, 1.00)", "rgba(250, 250, 250, 1.00)"], "height": 1054, "url": "https://data.smartidf.services/api/explore/v2.1/catalog/datasets/catalogue-de-messier/files/8c106b857bd4916cfc4712b82690df78"}, "const": "CVn",
        "difficulty": "Hard", "commonName": "Croc's Eye Galaxy", "constellation": "Canes Venatici", "type": "Galaxy", "size": "11.0' x 9.1'", "bestSeason": "Spring"
    },
    {
        "messier": "M90", "ngc": "NGC 4560", "objet": "Galaxy / Galaxie", "saison": "Spring / Printemps", "mag": 9, "english_name_nom_en_anglais": "Virgin", "french_name_nom_francais": "Vierge", "latin_name_nom_latin": "Virgo", "ra": "12:36:49.79", "dec": "+13:09:46.6", "distance": 41000000, "dimension": "9,5' x 4,7'", "decouvreur": "Messier", "annee": "1781", "image": "http://www.lasam.ca/messier/M090.JPG", "image_url": {"thumbnail": true, "filename": "M090.JPG.jpe", "format": "JPEG", "width": 816, "mimetype": "image/jpeg", "id": "24533f4722df7e1a3a89b6314be09bcd", "last_synchronized": "2017-01-13T14:11:09.223046", "color_summary": ["rgba(241, 240, 240, 1.00)", "rgba(252, 251, 251, 1.00)", "rgba(249, 248, 248, 1.00)"], "height": 1054, "url": "https://data.smartidf.services/api/explore/v2.1/catalog/datasets/catalogue-de-messier/files/24533f4722df7e1a3a89b6314be09bcd"}, "const": "Vir",
        "difficulty": "Hard", "commonName": null, "constellation": "Virgo", "type": "Galaxy", "size": "9.5' x 4.7'", "bestSeason": "Spring"
    },
    {
        "messier": "M87", "ngc": "NGC 4486", "objet": "Galaxy / Galaxie", "saison": "Spring / Printemps", "mag": 8, "english_name_nom_en_anglais": "Virgin", "french_name_nom_francais": "Vierge", "latin_name_nom_latin": "Virgo", "ra": "12:30:49.42", "dec": "+12:23:28.0", "distance": 63000000, "dimension": "7,2' x 6,8'", "decouvreur": "Messier", "annee": "1781", "image": "http://www.lasam.ca/messier/M087.JPG", "image_url": {"thumbnail": true, "filename": "M087.JPG.jpe", "format": "JPEG", "width": 816, "mimetype": "image/jpeg", "id": "23f8026f16d2f4c0e59b77f9c33a5917", "last_synchronized": "2017-01-13T14:11:07.101111", "color_summary": ["rgba(241, 240, 240, 1.00)", "rgba(252, 251, 251, 1.00)", "rgba(249, 248, 248, 1.00)"], "height": 1054, "url": "https://data.smartidf.services/api/explore/v2.1/catalog/datasets/catalogue-de-messier/files/23f8026f16d2f4c0e59b77f9c33a5917"}, "const": "Vir",
        "difficulty": "Hard", "commonName": "Virgo A", "constellation": "Virgo", "type": "Galaxy", "size": "7.2' x 6.8'", "bestSeason": "Spring"
    },
    {
        "messier": "M34", "ngc": "NGC 1039", "objet": "Open Cluster / Amas Ouvert", "saison": "Autumn / Automne", "mag": 5, "english_name_nom_en_anglais": "Perseus", "french_name_nom_francais": "Persée", "latin_name_nom_latin": "Perseus", "ra": "02:42:07.40", "dec": "+42:44:46.1", "distance": 1450, "dimension": "35,0'", "decouvreur": "Messier", "annee": "1764", "image": "http://www.lasam.ca/messier/M034.JPG", "image_url": {"thumbnail": true, "filename": "M034.JPG.jpe", "format": "JPEG", "width": 816, "mimetype": "image/jpeg", "id": "f77873064c67256350aa5817915fe480", "last_synchronized": "2017-01-13T14:10:24.811540", "color_summary": ["rgba(213, 213, 213, 1.00)", "rgba(245, 245, 245, 1.00)", "rgba(250, 250, 250, 1.00)"], "height": 1054, "url": "https://data.smartidf.services/api/explore/v2.1/catalog/datasets/catalogue-de-messier/files/f77873064c67256350aa5817915fe480"}, "const": "Per",
        "difficulty": "Easy", "commonName": "Spiral Cluster", "constellation": "Perseus", "type": "Open Cluster", "size": "35.0'", "bestSeason": "Autumn"
    },
    {
        "messier": "M13", "ngc": "NGC 6205", "objet": "Globular Cluster / Amas Globulaire", "saison": "Summer / Été", "mag": 5, "english_name_nom_en_anglais": "Hercules", "french_name_nom_francais": "Hercule", "latin_name_nom_latin": "Hercules", "ra": "16:41:41.63", "dec": "+36:27:40.7", "distance": 23500, "dimension": "23,2'", "decouvreur": "Halley", "annee": "1714", "image": "http://www.lasam.ca/messier/M013.JPG", "image_url": {"thumbnail": true, "filename": "M013.JPG.jpe", "format": "JPEG", "width": 816, "mimetype": "image/jpeg", "id": "50043671892eb3ae293cac3cb5fd0cab", "last_synchronized": "2017-01-13T14:10:07.815682", "color_summary": ["rgba(242, 241, 241, 1.00)", "rgba(252, 252, 252, 1.00)", "rgba(249, 249, 249, 1.00)"], "height": 1054, "url": "https://data.smartidf.services/api/explore/v2.1/catalog/datasets/catalogue-de-messier/files/50043671892eb3ae293cac3cb5fd0cab"}, "const": "Her",
        "difficulty": "Easy", "commonName": "Great Hercules Cluster", "constellation": "Hercules", "type": "Globular Cluster", "size": "23.2'", "bestSeason": "Summer"
    },
    {
        "messier": "M42", "ngc": "NGC 1976", "objet": "Emission Nebula / Nébuleuse à émission", "saison": "Winter / Hiver", "mag": 4, "english_name_nom_en_anglais": "Orion", "french_name_nom_francais": "Orion", "latin_name_nom_latin": "Orion", "ra": "05:35:17.3", "dec": "-05:23:28", "distance": 1344, "dimension": "85' x 60'", "decouvreur": "Peiresc", "annee": "1610", "image": "http://www.lasam.ca/messier/M042.JPG", "image_url": {"thumbnail": true, "filename": "M042.JPG.jpe", "format": "JPEG", "width": 816, "mimetype": "image/jpeg", "id": "90397cbe3746fedbf7f3fe98dd95c2f2", "last_synchronized": "2017-01-13T14:10:30.861485", "color_summary": ["rgba(232, 231, 231, 1.00)", "rgba(250, 249, 249, 1.00)", "rgba(248, 248, 248, 1.00)"], "height": 1054, "url": "https://data.smartidf.services/api/explore/v2.1/catalog/datasets/catalogue-de-messier/files/90397cbe3746fedbf7f3fe98dd95c2f2"}, "const": "Ori",
        "difficulty": "Easy", "commonName": "Orion Nebula", "constellation": "Orion", "type": "Emission Nebula", "size": "85' x 60'", "bestSeason": "Winter"
    },
    {
        "messier": "M31", "ngc": "NGC 224", "objet": "Galaxy / Galaxie", "saison": "Autumn / Automne", "mag": 3.4, "english_name_nom_en_anglais": "Andromeda", "french_name_nom_francais": "Andromède", "latin_name_nom_latin": "Andromeda", "ra": "00:42:44.3", "dec": "+41:16:09", "distance": 2540000, "dimension": "190' x 60'", "decouvreur": "Al Sufi", "annee": "964", "image": "http://www.lasam.ca/messier/M031.JPG", "image_url": {"thumbnail": true, "filename": "M031.JPG.jpe", "format": "JPEG", "width": 816, "mimetype": "image/jpeg", "id": "8b09c0b962eacd7c73b3654173640a72", "last_synchronized": "2017-01-13T14:10:22.644196", "color_summary": ["rgba(220, 219, 220, 1.00)", "rgba(252, 252, 252, 1.00)", "rgba(249, 248, 248, 1.00)"], "height": 1054, "url": "https://data.smartidf.services/api/explore/v2.1/catalog/datasets/catalogue-de-messier/files/8b09c0b962eacd7c73b3654173640a72"}, "const": "And",
        "difficulty": "Easy", "commonName": "Andromeda Galaxy", "constellation": "Andromeda", "type": "Galaxy", "size": "190' x 60'", "bestSeason": "Autumn"
    },
    {
        "messier": "M45", "ngc": null, "objet": "Open Cluster / Amas Ouvert", "saison": "Winter / Hiver", "mag": 1.6, "english_name_nom_en_anglais": "Pleiades", "french_name_nom_francais": "Pléiades", "latin_name_nom_latin": "Taurus", "ra": "03:47:24", "dec": "+24:07:00", "distance": 444, "dimension": "110'", "decouvreur": "Known since antiquity", "annee": null, "image": "http://www.lasam.ca/messier/M045.JPG", "image_url": {"thumbnail": true, "filename": "M045.JPG.jpe", "format": "JPEG", "width": 816, "mimetype": "image/jpeg", "id": "3f56749618b208f4a29b63292151475e", "last_synchronized": "2017-01-13T14:10:34.225034", "color_summary": ["rgba(239, 238, 239, 1.00)", "rgba(251, 249, 250, 1.00)", "rgba(248, 248, 248, 1.00)"], "height": 1054, "url": "https://data.smartidf.services/api/explore/v2.1/catalog/datasets/catalogue-de-messier/files/3f56749618b208f4a29b63292151475e"}, "const": "Tau",
        "difficulty": "Easy", "commonName": "Pleiades", "constellation": "Taurus", "type": "Open Cluster", "size": "110'", "bestSeason": "Winter"
    },
    {
        "messier": "M8", "ngc": "NGC 6523", "objet": "Emission Nebula / Nébuleuse à émission", "saison": "Summer / Été", "mag": 6, "english_name_nom_en_anglais": "Lagoon Nebula", "french_name_nom_francais": "Nébuleuse de la Lagune", "latin_name_nom_latin": "Sagittarius", "ra": "18:03:37", "dec": "-24:23:12", "distance": 4100, "dimension": "90' x 40'", "decouvreur": "Hodierna", "annee": "1654", "image": "http://www.lasam.ca/messier/M008.JPG", "image_url": {"thumbnail": true, "filename": "M008.JPG.jpe", "format": "JPEG", "width": 816, "mimetype": "image/jpeg", "id": "0a09915c6203f288d82ddb1236a986a1", "last_synchronized": "2017-01-13T14:10:03.990834", "color_summary": ["rgba(206, 204, 204, 1.00)", "rgba(186, 185, 186, 1.00)", "rgba(186, 185, 185, 1.00)"], "height": 1054, "url": "https://data.smartidf.services/api/explore/v2.1/catalog/datasets/catalogue-de-messier/files/0a09915c6203f288d82ddb1236a986a1"}, "const": "Sgr",
        "difficulty": "Easy", "commonName": "Lagoon Nebula", "constellation": "Sagittarius", "type": "Emission Nebula", "size": "90' x 40'", "bestSeason": "Summer"
    },
    {
        "messier": "M27", "ngc": "NGC 6853", "objet": "Planetary Nebula / Nébuleuse Planétaire", "saison": "Summer / Été", "mag": 7.5, "english_name_nom_en_anglais": "Dumbbell Nebula", "french_name_nom_francais": "Nébuleuse de l'Haltère", "latin_name_nom_latin": "Vulpecula", "ra": "19:59:36.34", "dec": "+22:43:16.1", "distance": 1360, "dimension": "8.0' x 5.6'", "decouvreur": "Messier", "annee": "1764", "image": "http://www.lasam.ca/messier/M027.JPG", "image_url": {"thumbnail": true, "filename": "M027.JPG.jpe", "format": "JPEG", "width": 816, "mimetype": "image/jpeg", "id": "5494a23d572d4041e15188e415c463a0", "last_synchronized": "2017-01-13T14:10:19.289122", "color_summary": ["rgba(188, 187, 187, 1.00)", "rgba(213, 212, 212, 1.00)", "rgba(219, 218, 218, 1.00)"], "height": 1054, "url": "https://data.smartidf.services/api/explore/v2.1/catalog/datasets/catalogue-de-messier/files/5494a23d572d4041e15188e415c463a0"}, "const": "Vul",
        "difficulty": "Easy", "commonName": "Dumbbell Nebula", "constellation": "Vulpecula", "type": "Planetary Nebula", "size": "8.0' x 5.6'", "bestSeason": "Summer"
    },
    {
        "messier": "M51", "ngc": "NGC 5194", "objet": "Galaxy / Galaxie", "saison": "Spring / Printemps", "mag": 8.4, "english_name_nom_en_anglais": "Whirlpool Galaxy", "french_name_nom_francais": "Galaxie du Tourbillon", "latin_name_nom_latin": "Canes Venatici", "ra": "13:29:52.7", "dec": "+47:11:43", "distance": 23000000, "dimension": "11.2' x 6.9'", "decouvreur": "Messier", "annee": "1773", "image": "http://www.lasam.ca/messier/M051.JPG", "image_url": {"thumbnail": true, "filename": "M051.JPG.jpe", "format": "JPEG", "width": 816, "mimetype": "image/jpeg", "id": "4351888ecb69e0401039ec50877e4855", "last_synchronized": "2017-01-13T14:10:38.884837", "color_summary": ["rgba(240, 240, 240, 1.00)", "rgba(253, 252, 252, 1.00)", "rgba(250, 250, 250, 1.00)"], "height": 1054, "url": "https://data.smartidf.services/api/explore/v2.1/catalog/datasets/catalogue-de-messier/files/4351888ecb69e0401039ec50877e4855"}, "const": "CVn",
        "difficulty": "Medium", "commonName": "Whirlpool Galaxy", "constellation": "Canes Venatici", "type": "Galaxy", "size": "11.2' x 6.9'", "bestSeason": "Spring"
    },
    {
        "messier": "M57", "ngc": "NGC 6720", "objet": "Planetary Nebula / Nébuleuse Planétaire", "saison": "Summer / Été", "mag": 8.8, "english_name_nom_en_anglais": "Ring Nebula", "french_name_nom_francais": "Nébuleuse de la Lyre", "latin_name_nom_latin": "Lyra", "ra": "18:53:35.08", "dec": "+33:01:45.0", "distance": 2300, "dimension": "1.4' x 1.0'", "decouvreur": "Darquier", "annee": "1779", "image": "http://www.lasam.ca/messier/M057.JPG", "image_url": {"thumbnail": true, "filename": "M057.JPG.jpe", "format": "JPEG", "width": 816, "mimetype": "image/jpeg", "id": "472ec85e2d24785c404bce9bc6992a4e", "last_synchronized": "2017-01-13T14:10:44.339143", "color_summary": ["rgba(238, 237, 237, 1.00)", "rgba(230, 230, 230, 1.00)", "rgba(231, 230, 230, 1.00)"], "height": 1054, "url": "https://data.smartidf.services/api/explore/v2.1/catalog/datasets/catalogue-de-messier/files/472ec85e2d24785c404bce9bc6992a4e"}, "const": "Lyr",
        "difficulty": "Medium", "commonName": "Ring Nebula", "constellation": "Lyra", "type": "Planetary Nebula", "size": "1.4' x 1.0'", "bestSeason": "Summer"
    },
    {
        "messier": "M81", "ngc": "NGC 3031", "objet": "Galaxy / Galaxie", "saison": "Spring / Printemps", "mag": 6.9, "english_name_nom_en_anglais": "Bode's Galaxy", "french_name_nom_francais": "Galaxie de Bode", "latin_name_nom_latin": "Ursa Major", "ra": "09:55:33.2", "dec": "+69:03:55", "distance": 12000000, "dimension": "26.9' x 14.1'", "decouvreur": "Bode", "annee": "1774", "image": "http://www.lasam.ca/messier/M081.JPG", "image_url": {"thumbnail": true, "filename": "M081.JPG.jpe", "format": "JPEG", "width": 816, "mimetype": "image/jpeg", "id": "98b8df1b91995265cc8974c72394d802", "last_synchronized": "2017-01-13T14:11:02.897264", "color_summary": ["rgba(242, 241, 241, 1.00)", "rgba(253, 252, 252, 1.00)", "rgba(249, 248, 249, 1.00)"], "height": 1054, "url": "https://data.smartidf.services/api/explore/v2.1/catalog/datasets/catalogue-de-messier/files/98b8df1b91995265cc8974c72394d802"}, "const": "UMa",
        "difficulty": "Medium", "commonName": "Bode's Galaxy", "constellation": "Ursa Major", "type": "Galaxy", "size": "26.9' x 14.1'", "bestSeason": "Spring"
    },
    {
        "messier": "M82", "ngc": "NGC 3034", "objet": "Galaxy / Galaxie", "saison": "Spring / Printemps", "mag": 8.4, "english_name_nom_en_anglais": "Cigar Galaxy", "french_name_nom_francais": "Galaxie du Cigare", "latin_name_nom_latin": "Ursa Major", "ra": "09:55:52.2", "dec": "+69:40:47", "distance": 12000000, "dimension": "11.2' x 4.3'", "decouvreur": "Bode", "annee": "1774", "image": "http://www.lasam.ca/messier/M082.JPG", "image_url": {"thumbnail": true, "filename": "M082.JPG.jpe", "format": "JPEG", "width": 816, "mimetype": "image/jpeg", "id": "a698c2b1317900b12c47e040eb93e70c", "last_synchronized": "2017-01-13T14:11:03.558648", "color_summary": ["rgba(242, 241, 241, 1.00)", "rgba(253, 252, 252, 1.00)", "rgba(249, 248, 248, 1.00)"], "height": 1054, "url": "https://data.smartidf.services/api/explore/v2.1/catalog/datasets/catalogue-de-messier/files/a698c2b1317900b12c47e040eb93e70c"}, "const": "UMa",
        "difficulty": "Medium", "commonName": "Cigar Galaxy", "constellation": "Ursa Major", "type": "Galaxy", "size": "11.2' x 4.3'", "bestSeason": "Spring"
    },
    {
        "messier": "M101", "ngc": "NGC 5457", "objet": "Galaxy / Galaxie", "saison": "Spring / Printemps", "mag": 7.9, "english_name_nom_en_anglais": "Pinwheel Galaxy", "french_name_nom_francais": "Galaxie du Moulinet", "latin_name_nom_latin": "Ursa Major", "ra": "14:03:12.6", "dec": "+54:20:57", "distance": 21000000, "dimension": "28.8' x 26.9'", "decouvreur": "Méchain", "annee": "1781", "image": "http://www.lasam.ca/messier/M101.JPG", "image_url": {"thumbnail": true, "filename": "M101.JPG.jpe", "format": "JPEG", "width": 816, "mimetype": "image/jpeg", "id": "0eb14758ee56fb463d6f42d798673e4f", "last_synchronized": "2017-01-13T14:11:19.074648", "color_summary": ["rgba(241, 240, 240, 1.00)", "rgba(252, 252, 252, 1.00)", "rgba(250, 250, 250, 1.00)"], "height": 1054, "url": "https://data.smartidf.services/api/explore/v2.1/catalog/datasets/catalogue-de-messier/files/0eb14758ee56fb463d6f42d798673e4f"}, "const": "UMa",
        "difficulty": "Medium", "commonName": "Pinwheel Galaxy", "constellation": "Ursa Major", "type": "Galaxy", "size": "28.8' x 26.9'", "bestSeason": "Spring"
    },
    {
        "messier": "M104", "ngc": "NGC 4594", "objet": "Galaxy / Galaxie", "saison": "Spring / Printemps", "mag": 8, "english_name_nom_en_anglais": "Sombrero Galaxy", "french_name_nom_francais": "Galaxie du Sombrero", "latin_name_nom_latin": "Corvus", "ra": "12:39:59.4", "dec": "-11:37:23", "distance": 29000000, "dimension": "8.7' x 3.5'", "decouvreur": "Méchain", "annee": "1781", "image": "http://www.lasam.ca/messier/M104.JPG", "image_url": {"thumbnail": true, "filename": "M104.JPG.jpe", "format": "JPEG", "width": 816, "mimetype": "image/jpeg", "id": "98ca6645bb15fb146eb24174c1385fe0", "last_synchronized": "2017-01-13T14:11:21.360612", "color_summary": ["rgba(240, 240, 240, 1.00)", "rgba(252, 252, 252, 1.00)", "rgba(250, 249, 249, 1.00)"], "height": 1054, "url": "https://data.smartidf.services/api/explore/v2.1/catalog/datasets/catalogue-de-messier/files/98ca6645bb15fb146eb24174c1385fe0"}, "const": "Vir",
        "difficulty": "Medium", "commonName": "Sombrero Galaxy", "constellation": "Virgo", "type": "Galaxy", "size": "8.7' x 3.5'", "bestSeason": "Spring"
    },
    {
        "messier": "M16", "ngc": "NGC 6611", "objet": "Emission Nebula / Nébuleuse à émission", "saison": "Summer / Été", "mag": 6, "english_name_nom_en_anglais": "Eagle Nebula", "french_name_nom_francais": "Nébuleuse de l'Aigle", "latin_name_nom_latin": "Serpens", "ra": "18:18:48", "dec": "-13:49:00", "distance": 7000, "dimension": "7.0'", "decouvreur": "Chéseaux", "annee": "1746", "image": "http://www.lasam.ca/messier/M016.JPG", "image_url": {"thumbnail": true, "filename": "M016.JPG.jpe", "format": "JPEG", "width": 816, "mimetype": "image/jpeg", "id": "815eebcc7d91f614254397f70ef9f3ed", "last_synchronized": "2017-01-13T14:10:10.245500", "color_summary": ["rgba(226, 225, 225, 1.00)", "rgba(212, 210, 211, 1.00)", "rgba(184, 183, 183, 1.00)"], "height": 1054, "url": "https://data.smartidf.services/api/explore/v2.1/catalog/datasets/catalogue-de-messier/files/815eebcc7d91f614254397f70ef9f3ed"}, "const": "Ser",
        "difficulty": "Medium", "commonName": "Eagle Nebula", "constellation": "Serpens", "type": "Emission Nebula", "size": "7.0'", "bestSeason": "Summer"
    },
    {
        "messier": "M20", "ngc": "NGC 6514", "objet": "Emission Nebula / Nébuleuse à émission", "saison": "Summer / Été", "mag": 6.3, "english_name_nom_en_anglais": "Trifid Nebula", "french_name_nom_francais": "Nébuleuse Trifide", "latin_name_nom_latin": "Sagittarius", "ra": "18:02:23", "dec": "-23:01:48", "distance": 5200, "dimension": "28'", "decouvreur": "Le Gentil", "annee": "1764", "image": "http://www.lasam.ca/messier/M020.JPG", "image_url": {"thumbnail": true, "filename": "M020.JPG.jpe", "format": "JPEG", "width": 816, "mimetype": "image/jpeg", "id": "78c02c7247e4b158d47d911995fa498b", "last_synchronized": "2017-01-13T14:10:13.332891", "color_summary": ["rgba(213, 211, 212, 1.00)", "rgba(188, 186, 187, 1.00)", "rgba(185, 184, 184, 1.00)"], "height": 1054, "url": "https://data.smartidf.services/api/explore/v2.1/catalog/datasets/catalogue-de-messier/files/78c02c7247e4b158d47d911995fa498b"}, "const": "Sgr",
        "difficulty": "Medium", "commonName": "Trifid Nebula", "constellation": "Sagittarius", "type": "Emission Nebula", "size": "28'", "bestSeason": "Summer"
    },
    {
        "messier": "M33", "ngc": "NGC 598", "objet": "Galaxy / Galaxie", "saison": "Autumn / Automne", "mag": 5.7, "english_name_nom_en_anglais": "Triangulum Galaxy", "french_name_nom_francais": "Galaxie du Triangle", "latin_name_nom_latin": "Triangulum", "ra": "01:33:50.9", "dec": "+30:39:36", "distance": 3000000, "dimension": "70.8' x 41.7'", "decouvreur": "Hodierna", "annee": "1654", "image": "http://www.lasam.ca/messier/M033.JPG", "image_url": {"thumbnail": true, "filename": "M033.JPG.jpe", "format": "JPEG", "width": 816, "mimetype": "image/jpeg", "id": "69d661776ffd8a5b3cfdd819f0455a22", "last_synchronized": "2017-01-13T14:10:24.032534", "color_summary": ["rgba(239, 238, 238, 1.00)", "rgba(252, 252, 252, 1.00)", "rgba(250, 249, 249, 1.00)"], "height": 1054, "url": "https://data.smartidf.services/api/explore/v2.1/catalog/datasets/catalogue-de-messier/files/69d661776ffd8a5b3cfdd819f0455a22"}, "const": "Tri",
        "difficulty": "Medium", "commonName": "Triangulum Galaxy", "constellation": "Triangulum", "type": "Galaxy", "size": "70.8' x 41.7'", "bestSeason": "Autumn"
    }
];
