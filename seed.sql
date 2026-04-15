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
('Mechanical Keyboard',        149.99, (SELECT id FROM users WHERE name='liam_foster'), ARRAY['electronics','gaming','accessories'], 'https://loremflickr.com/400/400/mechanical,keyboard'),
('Leather Wallet',              49.95, (SELECT id FROM users WHERE name='carlos_diaz'), ARRAY['fashion','accessories','leather'],    'https://loremflickr.com/400/400/leather,wallet'),
('Yoga Mat',                    39.00, (SELECT id FROM users WHERE name='zoe_miller'),  ARRAY['fitness','wellness','sport'],         'https://loremflickr.com/400/400/yoga,mat'),
('Canon DSLR Camera',          799.00, (SELECT id FROM users WHERE name='marcus_lee'),  ARRAY['electronics','photography','camera'], 'https://loremflickr.com/400/400/dslr,camera'),
('Running Shoes',              119.00, (SELECT id FROM users WHERE name='jake_burns'),  ARRAY['fashion','sport','footwear'],         'https://loremflickr.com/400/400/running,shoes'),
('Vintage Desk Lamp',           65.00, (SELECT id FROM users WHERE name='priya_nair'),  ARRAY['furniture','vintage','home'],         'https://loremflickr.com/400/400/desk,lamp'),
('Hiking Backpack',             89.00, (SELECT id FROM users WHERE name='tom_walsh'),   ARRAY['outdoors','sport','travel'],          'https://loremflickr.com/400/400/hiking,backpack'),
('Noise Cancelling Headphones',249.00, (SELECT id FROM users WHERE name='liam_foster'), ARRAY['electronics','audio','accessories'],  'https://loremflickr.com/400/400/headphones'),
('Scented Candle Set',          29.95, (SELECT id FROM users WHERE name='emma_watson'), ARRAY['home','wellness','gifts'],            'https://loremflickr.com/400/400/candle'),
('Linen Throw Blanket',         55.00, (SELECT id FROM users WHERE name='emma_watson'), ARRAY['home','furniture','bedroom'],         'https://loremflickr.com/400/400/blanket'),
('Graphic Tee',                 34.99, (SELECT id FROM users WHERE name='nina_okafor'), ARRAY['fashion','clothing','streetwear'],    'https://loremflickr.com/400/400/tshirt'),
('Wireless Charger',            44.00, (SELECT id FROM users WHERE name='carlos_diaz'), ARRAY['electronics','accessories','apple'],  'https://loremflickr.com/400/400/wireless,charger'),
('Climbing Harness',            78.00, (SELECT id FROM users WHERE name='tom_walsh'),   ARRAY['outdoors','sport','safety'],          'https://loremflickr.com/400/400/climbing'),
('Bookshelf',                  120.00, (SELECT id FROM users WHERE name='priya_nair'),  ARRAY['furniture','home','storage'],         'https://loremflickr.com/400/400/bookshelf'),
('Foam Roller',                 27.00, (SELECT id FROM users WHERE name='zoe_miller'),  ARRAY['fitness','wellness','recovery'],      'https://loremflickr.com/400/400/foam,roller'),
('Tripod Stand',                69.00, (SELECT id FROM users WHERE name='marcus_lee'),  ARRAY['photography','accessories','camera'], 'https://loremflickr.com/400/400/tripod'),
('RTX 4070 GPU',               699.00, (SELECT id FROM users WHERE name='liam_foster'), ARRAY['electronics','gaming','pc'],          'https://loremflickr.com/400/400/gpu,graphics,card'),
('Sunglasses',                  59.95, (SELECT id FROM users WHERE name='nina_okafor'), ARRAY['fashion','accessories','summer'],     'https://loremflickr.com/400/400/sunglasses'),
('Coffee Table',               195.00, (SELECT id FROM users WHERE name='priya_nair'),  ARRAY['furniture','home','living room'],     'https://loremflickr.com/400/400/coffee,table'),
('Protein Powder',              74.95, (SELECT id FROM users WHERE name='zoe_miller'),  ARRAY['fitness','nutrition','wellness'],     'https://loremflickr.com/400/400/protein,powder');
