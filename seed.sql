-- Walke seed data. All users have password: 123
-- Run with: psql -U postgres -d procurement -f seed.sql

INSERT INTO users (name, password_hash, bio, city, postcode, country) VALUES
('jake_burns',  '$2b$10$Yp/ruOhCnBBfssu.nf6g4OCeHo348ngLWDrd2D5utnsC30yjGD0H2', 'Sneakerhead and streetwear collector. Always looking for a deal.',            'Sydney',     '2000', 'Australia'),
('priya_nair',  '$2b$10$Yp/ruOhCnBBfssu.nf6g4OCeHo348ngLWDrd2D5utnsC30yjGD0H2', 'Interior designer with a love for vintage furniture and art prints.',         'Melbourne',  '3000', 'Australia'),
('tom_walsh',   '$2b$10$Yp/ruOhCnBBfssu.nf6g4OCeHo348ngLWDrd2D5utnsC30yjGD0H2', 'Outdoor adventurer selling gear I no longer use.',                            'Brisbane',   '4000', 'Australia'),
('sarah_chen',  '$2b$10$Yp/ruOhCnBBfssu.nf6g4OCeHo348ngLWDrd2D5utnsC30yjGD0H2', 'Minimalist lifestyle advocate. Decluttering one item at a time.',             'Perth',      '6000', 'Australia'),
('marcus_lee',  '$2b$10$Yp/ruOhCnBBfssu.nf6g4OCeHo348ngLWDrd2D5utnsC30yjGD0H2', 'Photographer and filmmaker. Selling used camera equipment.',                  'Adelaide',   '5000', 'Australia'),
('nina_okafor', '$2b$10$Yp/ruOhCnBBfssu.nf6g4OCeHo348ngLWDrd2D5utnsC30yjGD0H2', 'Fashion lover and small business owner. Ships Australia-wide.',               'Canberra',   '2600', 'Australia'),
('liam_foster', '$2b$10$Yp/ruOhCnBBfssu.nf6g4OCeHo348ngLWDrd2D5utnsC30yjGD0H2', 'PC builder and tech nerd. All parts tested before listing.',                  'Hobart',     '7000', 'Australia'),
('emma_watson', '$2b$10$Yp/ruOhCnBBfssu.nf6g4OCeHo348ngLWDrd2D5utnsC30yjGD0H2', 'Books, candles, and cosy things. Slow living enthusiast.',                   'Darwin',     '0800', 'Australia'),
('carlos_diaz', '$2b$10$Yp/ruOhCnBBfssu.nf6g4OCeHo348ngLWDrd2D5utnsC30yjGD0H2', 'Flipping quality goods. Fast shipping, great prices.',                        'Gold Coast', '4217', 'Australia'),
('zoe_miller',  '$2b$10$Yp/ruOhCnBBfssu.nf6g4OCeHo348ngLWDrd2D5utnsC30yjGD0H2', 'Yoga instructor selling wellness and fitness gear.',                          'Newcastle',  '2300', 'Australia');

INSERT INTO products (name, price, seller_id, tags, image_url) VALUES
('Mechanical Keyboard',       149.99, (SELECT id FROM users WHERE name='liam_foster'), ARRAY['electronics','gaming','accessories'], 'https://picsum.photos/seed/keyboard1/400/400'),
('Leather Wallet',             49.95, (SELECT id FROM users WHERE name='carlos_diaz'), ARRAY['fashion','accessories','leather'],    'https://picsum.photos/seed/wallet22/400/400'),
('Yoga Mat',                   39.00, (SELECT id FROM users WHERE name='zoe_miller'),  ARRAY['fitness','wellness','sport'],         'https://picsum.photos/seed/yogamat5/400/400'),
('Canon DSLR Camera',         799.00, (SELECT id FROM users WHERE name='marcus_lee'),  ARRAY['electronics','photography','camera'], 'https://picsum.photos/seed/camera99/400/400'),
('Running Shoes',             119.00, (SELECT id FROM users WHERE name='jake_burns'),  ARRAY['fashion','sport','footwear'],         'https://picsum.photos/seed/shoes77/400/400'),
('Vintage Desk Lamp',          65.00, (SELECT id FROM users WHERE name='priya_nair'),  ARRAY['furniture','vintage','home'],         'https://picsum.photos/seed/lamp13/400/400'),
('Hiking Backpack',            89.00, (SELECT id FROM users WHERE name='tom_walsh'),   ARRAY['outdoors','sport','travel'],          'https://picsum.photos/seed/backpack3/400/400'),
('Noise Cancelling Headphones',249.00,(SELECT id FROM users WHERE name='liam_foster'), ARRAY['electronics','audio','accessories'],  'https://picsum.photos/seed/headphones8/400/400'),
('Scented Candle Set',         29.95, (SELECT id FROM users WHERE name='emma_watson'), ARRAY['home','wellness','gifts'],            'https://picsum.photos/seed/candles4/400/400'),
('Linen Throw Blanket',        55.00, (SELECT id FROM users WHERE name='emma_watson'), ARRAY['home','furniture','bedroom'],         'https://picsum.photos/seed/blanket6/400/400'),
('Graphic Tee',                34.99, (SELECT id FROM users WHERE name='nina_okafor'), ARRAY['fashion','clothing','streetwear'],    'https://picsum.photos/seed/tshirt2/400/400'),
('Wireless Charger',           44.00, (SELECT id FROM users WHERE name='carlos_diaz'), ARRAY['electronics','accessories','apple'],  'https://picsum.photos/seed/charger7/400/400'),
('Climbing Harness',           78.00, (SELECT id FROM users WHERE name='tom_walsh'),   ARRAY['outdoors','sport','safety'],          'https://picsum.photos/seed/harness1/400/400'),
('Bookshelf',                 120.00, (SELECT id FROM users WHERE name='priya_nair'),  ARRAY['furniture','home','storage'],         'https://picsum.photos/seed/shelf55/400/400'),
('Foam Roller',                27.00, (SELECT id FROM users WHERE name='zoe_miller'),  ARRAY['fitness','wellness','recovery'],      'https://picsum.photos/seed/foam11/400/400'),
('Tripod Stand',               69.00, (SELECT id FROM users WHERE name='marcus_lee'),  ARRAY['photography','accessories','camera'], 'https://picsum.photos/seed/tripod9/400/400'),
('RTX 4070 GPU',              699.00, (SELECT id FROM users WHERE name='liam_foster'), ARRAY['electronics','gaming','pc'],          'https://picsum.photos/seed/gpu42/400/400'),
('Sunglasses',                 59.95, (SELECT id FROM users WHERE name='nina_okafor'), ARRAY['fashion','accessories','summer'],     'https://picsum.photos/seed/sunnies3/400/400'),
('Coffee Table',              195.00, (SELECT id FROM users WHERE name='priya_nair'),  ARRAY['furniture','home','living room'],     'https://picsum.photos/seed/table21/400/400'),
('Protein Powder',             74.95, (SELECT id FROM users WHERE name='zoe_miller'),  ARRAY['fitness','nutrition','wellness'],     'https://picsum.photos/seed/protein6/400/400');
