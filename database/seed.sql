-- USAhudHomes.com Seed Data
-- Initial data for properties, agents, and system setup
-- Created: November 3, 2025

-- ============================================
-- SEED AGENT: Marc Spencer
-- ============================================
INSERT INTO agents (
    first_name,
    last_name,
    email,
    phone,
    company,
    license_number,
    license_state,
    specialties,
    states_covered,
    years_experience,
    bio,
    is_admin,
    is_active,
    total_listings
) VALUES (
    'Marc',
    'Spencer',
    'marcspencer28461@gmail.com',
    '(910) 363-6147',
    'Lightkeeper Realty',
    'NC-HUD-REGISTERED',
    'NC',
    '["HUD Homes", "FHA 203k Loans", "First-Time Buyers", "Investment Properties", "Foreclosures"]'::jsonb,
    '["NC", "TN"]'::jsonb,
    25,
    'Marc Spencer is a seasoned HUD home specialist with over 25 years of experience helping buyers navigate the HUD home buying process. As the founder of Lightkeeper Realty and creator of USAhudHomes.com, Marc has helped hundreds of families find their dream homes through the HUD program. His expertise in FHA 203k renovation loans and first-time homebuyer programs makes him an invaluable resource for anyone looking to purchase a HUD property in North Carolina or Tennessee.',
    true,
    true,
    25
) ON CONFLICT (email) DO UPDATE SET
    phone = EXCLUDED.phone,
    company = EXCLUDED.company,
    updated_at = NOW();

-- ============================================
-- SEED PROPERTIES: 25 North Carolina HUD Homes
-- ============================================

-- Property 1: Yanceyville
INSERT INTO properties (
    case_number, address, city, state, zip_code, county, price,
    beds, baths, sq_ft, lot_size, year_built, status,
    main_image, description, features
) VALUES (
    '387-111612',
    '80 Prong Creek Ln',
    'Yanceyville',
    'NC',
    '27379',
    'Caswell County',
    544000.00,
    3, 2.0, 3073, '5.52 acres', 2005,
    'BIDS OPEN',
    '/images/properties/387-111612.jpg',
    'Beautiful 3-bedroom, 2-bathroom home on 5.52 acres in Caswell County. This spacious property features 3,073 sq ft of living space built in 2005.',
    '["Fireplace", "Open Floor Plan", "Master Suite", "Walk-in Closets", "Patio/Deck", "Porch", "Large Lot"]'::jsonb
) ON CONFLICT (case_number) DO NOTHING;

-- Property 2: Charlotte
INSERT INTO properties (
    case_number, address, city, state, zip_code, county, price,
    beds, baths, sq_ft, lot_size, year_built, status,
    main_image, description
) VALUES (
    '387-570372',
    '2105 Fathom Way',
    'Charlotte',
    'NC',
    '28216',
    'Mecklenburg County',
    365000.00,
    4, 2.1, 2850, '0.25 acres', 2008,
    'BIDS OPEN',
    '/images/properties/387-570372.jpg',
    'Spacious 4-bedroom, 2.1-bathroom home in Charlotte''s Mecklenburg County. Built in 2008 with 2,850 sq ft.'
) ON CONFLICT (case_number) DO NOTHING;

-- Property 3: Kittrell
INSERT INTO properties (
    case_number, address, city, state, zip_code, county, price,
    beds, baths, sq_ft, lot_size, year_built, status,
    main_image, description
) VALUES (
    '387-412268',
    '162 Black Horse Ln',
    'Kittrell',
    'NC',
    '27544',
    'Vance County',
    336150.00,
    3, 3.0, 2650, '1.8 acres', 2001,
    'PRICE REDUCED',
    '/images/properties/387-412268.jpg',
    'Charming 3-bedroom, 3-bathroom home on 1.8 acres in Vance County. Price recently reduced!'
) ON CONFLICT (case_number) DO NOTHING;

-- Property 4: Clayton
INSERT INTO properties (
    case_number, address, city, state, zip_code, county, price,
    beds, baths, sq_ft, lot_size, year_built, status,
    main_image, description
) VALUES (
    '381-799288',
    '3009 Wynston Way',
    'Clayton',
    'NC',
    '27520',
    'Johnston County',
    310500.00,
    3, 2.0, 2200, '0.3 acres', 2015,
    'BIDS OPEN',
    '/images/properties/381-799288.jpg',
    'Modern 3-bedroom, 2-bathroom home in Clayton. Built in 2015 with 2,200 sq ft.'
) ON CONFLICT (case_number) DO NOTHING;

-- Property 5: Highlands
INSERT INTO properties (
    case_number, address, city, state, zip_code, county, price,
    beds, baths, sq_ft, year_built, status,
    main_image, description
) VALUES (
    '387-069497',
    '3819 Flat Mountain Rd',
    'Highlands',
    'NC',
    '28741',
    'Macon County',
    716600.00,
    3, 3.0, 2800, 2000,
    'PRICE REDUCED',
    '/images/properties/387-069497.jpg',
    'Stunning mountain home in Highlands with 3 bedrooms and 3 bathrooms.'
) ON CONFLICT (case_number) DO NOTHING;

-- Property 6: Ocean Isle Beach
INSERT INTO properties (
    case_number, address, city, state, zip_code, county, price,
    beds, baths, sq_ft, year_built, status,
    main_image, description
) VALUES (
    '387-035060',
    '1694 Lake Tree Dr SW',
    'Ocean Isle Beach',
    'NC',
    '28469',
    'Brunswick County',
    305000.00,
    3, 2.0, 1800, 2005,
    'AVAILABLE',
    '/images/properties/387-035060.jpg',
    'Coastal living at its finest! 3-bedroom, 2-bathroom home near Ocean Isle Beach.'
) ON CONFLICT (case_number) DO NOTHING;

-- Properties 7-25: Additional NC properties
INSERT INTO properties (case_number, address, city, state, zip_code, county, price, status, main_image) VALUES
('387-123456', '456 Oak Street', 'Raleigh', 'NC', '27601', 'Wake County', 285000.00, 'AVAILABLE', '/images/properties/387-123456.jpg'),
('387-234567', '789 Pine Avenue', 'Durham', 'NC', '27701', 'Durham County', 245000.00, 'BIDS OPEN', '/images/properties/387-234567.jpg'),
('387-345678', '321 Maple Drive', 'Greensboro', 'NC', '27401', 'Guilford County', 195000.00, 'AVAILABLE', '/images/properties/387-345678.jpg'),
('387-456789', '654 Elm Street', 'Winston-Salem', 'NC', '27101', 'Forsyth County', 175000.00, 'PRICE REDUCED', '/images/properties/387-456789.jpg'),
('387-567890', '987 Cedar Lane', 'Fayetteville', 'NC', '28301', 'Cumberland County', 165000.00, 'AVAILABLE', '/images/properties/387-567890.jpg'),
('387-678901', '147 Birch Road', 'Wilmington', 'NC', '28401', 'New Hanover County', 325000.00, 'BIDS OPEN', '/images/properties/387-678901.jpg'),
('387-789012', '258 Spruce Court', 'Asheville', 'NC', '28801', 'Buncombe County', 395000.00, 'AVAILABLE', '/images/properties/387-789012.jpg'),
('387-890123', '369 Willow Way', 'Concord', 'NC', '28025', 'Cabarrus County', 215000.00, 'BIDS OPEN', '/images/properties/387-890123.jpg'),
('387-901234', '741 Hickory Place', 'Gastonia', 'NC', '28052', 'Gaston County', 185000.00, 'AVAILABLE', '/images/properties/387-901234.jpg'),
('387-012345', '852 Walnut Street', 'Rocky Mount', 'NC', '27801', 'Nash County', 155000.00, 'PRICE REDUCED', '/images/properties/387-012345.jpg'),
('387-112233', '963 Chestnut Avenue', 'Burlington', 'NC', '27215', 'Alamance County', 205000.00, 'AVAILABLE', '/images/properties/387-112233.jpg'),
('387-223344', '159 Dogwood Drive', 'High Point', 'NC', '27260', 'Guilford County', 225000.00, 'BIDS OPEN', '/images/properties/387-223344.jpg'),
('387-334455', '357 Magnolia Lane', 'Greenville', 'NC', '27834', 'Pitt County', 195000.00, 'AVAILABLE', '/images/properties/387-334455.jpg'),
('387-445566', '468 Azalea Court', 'Jacksonville', 'NC', '28540', 'Onslow County', 175000.00, 'BIDS OPEN', '/images/properties/387-445566.jpg'),
('387-556677', '579 Camellia Way', 'Cary', 'NC', '27511', 'Wake County', 345000.00, 'AVAILABLE', '/images/properties/387-556677.jpg'),
('387-667788', '680 Gardenia Place', 'Apex', 'NC', '27502', 'Wake County', 315000.00, 'PRICE REDUCED', '/images/properties/387-667788.jpg'),
('387-778899', '791 Jasmine Road', 'Morrisville', 'NC', '27560', 'Wake County', 295000.00, 'AVAILABLE', '/images/properties/387-778899.jpg'),
('387-889900', '802 Lilac Street', 'Holly Springs', 'NC', '27540', 'Wake County', 275000.00, 'BIDS OPEN', '/images/properties/387-889900.jpg'),
('387-990011', '913 Rose Avenue', 'Fuquay-Varina', 'NC', '27526', 'Wake County', 255000.00, 'AVAILABLE', '/images/properties/387-990011.jpg')
ON CONFLICT (case_number) DO NOTHING;

-- ============================================
-- UPDATE AGENT LISTING COUNT
-- ============================================
UPDATE agents 
SET total_listings = (SELECT COUNT(*) FROM properties WHERE is_active = true)
WHERE email = 'marcspencer28461@gmail.com';
