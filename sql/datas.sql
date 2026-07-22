-- ============================================================================
-- STRATA 2K26 — Live Seed Data (Fetched dynamically from live DB)
-- ============================================================================

-- 1. Venues
DELETE FROM public.venues;
INSERT INTO public.venues (id, venue_name, created_at) VALUES ('e9253456-92ba-4937-9f65-3882f24f4ab3', 'UG Lab', '2026-07-13T06:34:11.359942+00:00') ON CONFLICT (id) DO UPDATE SET venue_name = EXCLUDED.venue_name;
INSERT INTO public.venues (id, venue_name, created_at) VALUES ('8e3c00e0-1af3-46db-846c-fec14d5dfbc7', 'Auditorium', '2026-07-13T06:34:19.930706+00:00') ON CONFLICT (id) DO UPDATE SET venue_name = EXCLUDED.venue_name;
INSERT INTO public.venues (id, venue_name, created_at) VALUES ('1caef901-b875-48b2-8018-6c981551f005', 'E-Lab', '2026-07-13T06:34:33.618803+00:00') ON CONFLICT (id) DO UPDATE SET venue_name = EXCLUDED.venue_name;
INSERT INTO public.venues (id, venue_name, created_at) VALUES ('1e3e11c2-0f56-4d1b-ac57-4a64ee4fb948', 'C10 Room', '2026-07-13T06:35:11.667137+00:00') ON CONFLICT (id) DO UPDATE SET venue_name = EXCLUDED.venue_name;
INSERT INTO public.venues (id, venue_name, created_at) VALUES ('c888f807-e6ec-4edc-873b-c31748519f8b', 'C9 Room', '2026-07-13T06:35:39.397912+00:00') ON CONFLICT (id) DO UPDATE SET venue_name = EXCLUDED.venue_name;
INSERT INTO public.venues (id, venue_name, created_at) VALUES ('1526a9a9-09ca-4b42-9511-16d2812241f0', 'Seminar Hall - C', '2026-07-13T07:21:45.603288+00:00') ON CONFLICT (id) DO UPDATE SET venue_name = EXCLUDED.venue_name;
INSERT INTO public.venues (id, venue_name, created_at) VALUES ('a90facbf-0de3-4c90-8504-9234ce67f0d0', 'C12 Room', '2026-07-14T04:54:34.079697+00:00') ON CONFLICT (id) DO UPDATE SET venue_name = EXCLUDED.venue_name;

-- 2. Settings
INSERT INTO public.settings (key_name, value) VALUES ('gpay_qr_url', '') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('about_us', 'Ayya Nadar Janaki Ammal College (ANJAC), Sivakasi, established in 1963, is a pioneer in rural education and a UGC-conferred ''College of Excellence''. STRATA 2K26 is our premier State-Level Intercollegiate Technical Meet organized by the Department of Computer Science, aimed at fostering competitive excellence and innovation in computer technology.') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('about_college_title', 'Ayya Nadar Janaki Ammal College') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('about_college_description', 'Ayya Nadar Janaki Ammal College (Autonomous), Sivakasi, established in 1963, in the industrial corporation of Sivakasi, popularly known as “Kutty Japan” in Tamil Nadu is a standing testimony to the wisdom and futuristic vision of late Thiru 

P. Ayya Nadar, a leading businessman and pioneering industrialist of this corporation. As the institution was established by his munificence, the college was fittingly named after him and his equally generous wife, Thirumathi A. Janaki Ammal. The college has been serving as a beacon light in the backward area of Virudhunagar District, emphasizing teaching, learning and research programmes in different disciplines for the benefit of thousands of rural students who pursue higher education. The college is reaccredited with “A+” grade (CGPA of 3.48 out of 4) in the 4   cycle of reaccreditation by NAAC and recognized as College of Excellence') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('invitation_title', 'You Are Cordially Invited') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('invitation_tagline', 'STRATA 2K26 -- State Level Intercollegiate Technical Meet, ANJAC Sivakasi') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('invitation_body', 'On behalf of the Department of Computer Science, Ayya Nadar Janaki Ammal College (Autonomous), Sivakasi, we warmly invite you and your talented students to participate in STRATA 2K26 -- our prestigious State Level Intercollegiate Technical Meet.

The event features 8 exciting contests: Logic Hunt, Mind Spark, Code Detox, Tech Premier League, Idea Forge, Code Sprint, Syntax Wars, and Frame Fusion.

Date: 07 August 2026
Venue: ANJAC, Sivakasi
Registration Fee: Rs. 236 per participant (Spot Registration)
Spot Registration opens at 8:30 AM and closes at 9:30 AM.

We warmly look forward to welcoming you and your participants to our campus.') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('whatsapp_group_link', 'https://chat.whatsapp.com/GLDMqiPAf3k1u7WycKS3hs?s=cl&p=a&ilr=1&amv=0') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('invitation_pdf_url', 'https://yureobroqmpopukqhkll.supabase.co/storage/v1/object/public/assets/invitation_pdf_url_1784123852284.pdf') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('show_winners_page', 'false') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('participation_cert_url', 'https://yureobroqmpopukqhkll.supabase.co/storage/v1/object/public/assets/participation_cert_template_1784185791817.pdf') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('about_dept_logo_url', 'https://yureobroqmpopukqhkll.supabase.co/storage/v1/object/public/assets/about_dept_logo_url_1784123618611.png') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('payment_image_url', 'https://yureobroqmpopukqhkll.supabase.co/storage/v1/object/public/assets/payment_image_url_1783789933944.png') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('payment_qr_url', 'https://yureobroqmpopukqhkll.supabase.co/storage/v1/object/public/assets/payment_image_url_1783789933944.png') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('participation_cert_layout', '{"student_name":{"x":60.79881656804734,"y":48.583984375,"fontSize":20,"font":"Helvetica","enabled":true,"color":"#000000"},"college_name":{"x":50.29585798816568,"y":54.833984375,"fontSize":14,"font":"Helvetica","enabled":true,"color":"#000000"},"event_name":{"x":50.14792899408283,"y":61.500651041666664,"fontSize":19,"font":"Helvetica","enabled":true,"color":"#000000"}}') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('fee_per_student', '236') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('winner_cert_1_url', 'https://yureobroqmpopukqhkll.supabase.co/storage/v1/object/public/assets/winner_cert_1_template_1784185741333.pdf') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('winner_cert_1_layout', '{"student_name":{"x":63.837638376383765,"y":49.14143880208333,"fontSize":24,"font":"Helvetica","enabled":true,"color":"#000000"},"college_name":{"x":53.210332103321036,"y":54.97477213541667,"fontSize":14,"font":"Helvetica","enabled":true,"color":"#000000"},"event_name":{"x":69.2988929889299,"y":60.5,"fontSize":18,"font":"Helvetica","enabled":true,"color":"#000000"},"place":{"x":50,"y":75,"fontSize":20,"font":"Helvetica-Bold","enabled":false,"color":"#ff1744"}}') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('event_started', 'false') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('event_logo_url', 'https://yureobroqmpopukqhkll.supabase.co/storage/v1/object/public/assets/event_logo_url_1783919446480.png') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('winner_cert_2_url', 'https://yureobroqmpopukqhkll.supabase.co/storage/v1/object/public/assets/winner_cert_2_template_1784185631461.pdf') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('about_college_url', 'https://anjac.edu.in/') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('about_dept_title', 'Department of Computer Science (R)') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('contact_email', 'cs-regular@anjaconline.org') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('about_college_logo_url', 'https://yureobroqmpopukqhkll.supabase.co/storage/v1/object/public/assets/about_college_logo_url_1783920609334.jpg') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('contact_phone', '+91 9787970633, +91 7639535161') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('contact_address', 'Department of Computer Science(Regular), Ayya Nadar Janaki Ammal College (Autonomous), Sivakasi - Srivilliputhur Road, Sivakasi - 626 124, Tamil Nadu, India.') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('about_dept_url', 'https://cs-regular.netlify.app/') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('contact_extra', ' Mr. M. SAKTHI  SARAVANAN M.Sc., M.Phil.') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('event_date', '2026-08-07 10:00:00') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('upi_id', '9384170824@ibl') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('demo_video_url', 'https://youtube.com/shorts/YAQVPeN_sW4?feature=share') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('winner_cert_2_layout', '{"student_name":{"x":62.66805146846691,"y":49,"fontSize":24,"font":"Helvetica-Bold","enabled":true,"color":"#000000"},"college_name":{"x":52.91904679476084,"y":55.55989583333333,"fontSize":14,"font":"Helvetica-Bold","enabled":true,"color":"#000000"},"event_name":{"x":70.20137326178524,"y":61,"fontSize":18,"font":"Helvetica-Bold","enabled":true,"color":"#000000"},"place":{"x":50,"y":75,"fontSize":20,"font":"Helvetica-Bold","enabled":false,"color":"#ff1744"}}') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key_name, value) VALUES ('about_dept_description', 'The Department of Computer Science is dedicated to cultivating the next generation of technology innovators and global leaders. Our vision is to develop industry-ready, dynamic professionals driven by innovation, ambition, and a commitment to global progress. By shaping students into future-ready leaders, the department emphasizes excellence in science and technology while fostering ethical values, creativity, and lifelong learning. Through this holistic approach, our graduates are empowered to confidently navigate the challenges of rapid technological advancements and the ever-expanding digital landscape.
') ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;

-- 3. Leaders
DELETE FROM public.leaders;
INSERT INTO public.leaders (id, name, position, description, image_url, created_at) VALUES ('66e99fc8-3344-4e2f-acca-55929737d16d', 'Thiru. V. Ayyan Kodiswaran B.Tech.', 'Correspondent', NULL, 'https://yureobroqmpopukqhkll.supabase.co/storage/v1/object/public/assets/leader_1784123320628_64472312-715c-4db1-a496-677bba78c7c0.jpg', '2026-07-15T13:42:07.430888+00:00');
INSERT INTO public.leaders (id, name, position, description, image_url, created_at) VALUES ('839a6263-070d-4d84-9d3c-5cb257f15926', 'Dr. C. Ashok  M.P.Ed., M.Phil., D.Y.Ed., Ph.D.', 'Principal ', NULL, 'https://yureobroqmpopukqhkll.supabase.co/storage/v1/object/public/assets/leader_1784123331035_83d038bf-1c00-4ba5-8f8e-f17151ec93ec.jpg', '2026-07-15T13:42:43.048349+00:00');
INSERT INTO public.leaders (id, name, position, description, image_url, created_at) VALUES ('2c26abda-980d-406f-89ae-a4b3645aeb02', 'Mr. V. Venkatesh Babu B.E. (Hons), M. Phil.,', 'Head of the Department', NULL, 'https://yureobroqmpopukqhkll.supabase.co/storage/v1/object/public/assets/leader_1784123405665_4b3c4038-6f0c-4141-a084-d0dfeee68b87.jpg', '2026-07-15T13:43:44.607432+00:00');
INSERT INTO public.leaders (id, name, position, description, image_url, created_at) VALUES ('ee1ab916-c114-421a-ae05-4239148f28f4', 'Mr. M. Sakthi Saravanan M.Sc., M.Phil.,', 'Convener', NULL, 'https://yureobroqmpopukqhkll.supabase.co/storage/v1/object/public/assets/leader_1784123416279_02048d79-dbc4-4eea-8fce-b325f947a7a0.jpg', '2026-07-15T13:44:22.428208+00:00');

-- 4. Rules
DELETE FROM public.rules;
INSERT INTO public.rules (id, title, points, created_at) VALUES ('120e9c3b-1abc-48e0-abd9-2213d80f970b', 'Common Rules', 'Registration fee is 236/- per participant (Including GST 18% as per govt norms)                                                         
Special Website is designed for Strata’26 (anjacstrata.netlify.app)
Scan the QR code sent in the invitation with the registration page scanner provided in the website and start registration online (Use the demo video for procedure)
The Digital Certificates for the winners and participants can be downloaded from website through leader login after Valedictory Function
Spot registration is also available.', '2026-07-10T15:42:35.891465+00:00');
INSERT INTO public.rules (id, title, points, created_at) VALUES ('1b03af76-fdef-4375-a733-0264bb940be6', 'Eligibility Criteria', 'Strata-2k26 is exclusively for UG & PG students of Computer based courses
Maximum number of participants per team is 15
It is the responsibility of the participants to avoid clashes between the events they are participating', '2026-07-10T15:42:35.891465+00:00');
INSERT INTO public.rules (id, title, points, created_at) VALUES ('00e3b310-b136-4ec9-840f-7c5adc33c958', 'Registration Rules', 'Registrations must be initialized and managed by a designated Student Leader representing their college/department.
A college/department can register only one team per active contest 
Leaders must enter the correct name, rollno, and food preference (Veg/Non-Veg) for each participant(This name will be print in Certificate).
Participants cannot register for multiple contests that have overlapping preliminary or mains round times.
Leaders can scan the amount-specific dynamic UPI QR code generated on their Payment page to clear their pending balance.
After payment, leaders must click the WhatsApp button to join the official group and upload the payment receipt screenshot.
Once the event is officially started by the administrators, registrations will be locked to read-only status and cannot be edited.', '2026-07-10T15:42:35.891465+00:00');

-- 5. Events
DELETE FROM public.events CASCADE;
INSERT INTO public.events (id, event_name, category, description, rules, staff_incharge, minimum_participants, maximum_participants, team_size, prelims_venue, mains_venue, preliminary, mains, status, created_at) VALUES (
          '50000000-0000-0000-0000-000000000016',
          'Code Sprint',
          'Software Contest',
          'Implement clean, optimized algorithms for spot problems under time limits.',
          'One participant per team

Preliminary will be conducted

Duration is an hour.

Problem will be given on the spot

Software can be used C/Java/Python',
          '3f27bd89-58fc-4366-9a69-63ec1e99da62',
          1,
          1,
          1,
          'e9253456-92ba-4937-9f65-3882f24f4ab3',
          'e9253456-92ba-4937-9f65-3882f24f4ab3',
          '11:00:00'::time,
          '12:00:00'::time,
          'active',
          '2026-07-10T15:42:35.891465+00:00'
        );
INSERT INTO public.events (id, event_name, category, description, rules, staff_incharge, minimum_participants, maximum_participants, team_size, prelims_venue, mains_venue, preliminary, mains, status, created_at) VALUES (
          '50000000-0000-0000-0000-000000000015',
          'Idea Forge',
          'Idea Presentation',
          'Showcase your creativity by presenting innovative AI solutions for the future.',
          'Two participants per team

Five minutes for presentation and three minutes for queries

Original innovative ideas/ projects can be presented  

Topics may be from  the following AI

Retrieval-Augmented Generation (RAG): Making AI More Accurate with External Knowledge

Model Context Protocol (MCP): Connecting AI with Tools and Applications

Agentic AI: AI That Can Think, Plan, and Take Actions

AI Agents: Intelligent Assistants for Everyday Tasks

Large Language Models (LLMs): How ChatGPT and Similar AI Work

Generative AI: Creating Text, Images, Music, and Code

AI in Education: Transforming Learning and Teaching

AI for Smart Healthcare: Better Diagnosis and Patient Care

Ethical AI: Privacy, Fairness, and Responsible AI Development

The Future of AI: Smart Robots, Automation, and Human-AI Collaboration

Note : Your presentation should be reached either in ppt or pdf format on or before 05.08.2026 to this mail id: cs-regular@anjaconline.org',
          '15a22362-13e8-4126-a5a2-d357eafda691',
          2,
          2,
          2,
          NULL,
          '1526a9a9-09ca-4b42-9511-16d2812241f0',
          NULL,
          '11:00:00'::time,
          'active',
          '2026-07-10T15:42:35.891465+00:00'
        );
INSERT INTO public.events (id, event_name, category, description, rules, staff_incharge, minimum_participants, maximum_participants, team_size, prelims_venue, mains_venue, preliminary, mains, status, created_at) VALUES (
          '50000000-0000-0000-0000-000000000017',
          'Syntax Wars',
          'Debugging',
          'Identify and correct syntactic and logical errors in code files.',
          'One participant per team.

Identify and correct errors in the given programs.

Languages may include C, C++, Java, and Python.

Duration is 45 minutes.',
          '0d181587-b99f-4e18-a130-879c713d6394',
          1,
          1,
          1,
          'e9253456-92ba-4937-9f65-3882f24f4ab3',
          'e9253456-92ba-4937-9f65-3882f24f4ab3',
          '11:00:00'::time,
          '12:00:00'::time,
          'active',
          '2026-07-10T15:42:35.891465+00:00'
        );
INSERT INTO public.events (id, event_name, category, description, rules, staff_incharge, minimum_participants, maximum_participants, team_size, prelims_venue, mains_venue, preliminary, mains, status, created_at) VALUES (
          '50000000-0000-0000-0000-000000000018',
          'Frame Fusion',
          'Short Film',
          'Showcase your cinematic and storytelling skills on an open theme.',
          'The competition is based on an Open Theme.

A maximum of 2 participants are allowed per team.

The duration of the short film must be between 3–4 minutes (including title and credits).

The completed short film must be submitted on or before 02/08/2026, prior to the event date.

Any film containing vulgar,offensive, illegal, or unsafe content will be disqualified.

The use of copyrighted music, movie clips, images, or any other copyrighted material without proper authorization is strictly prohibited and will result in disqualification.

Note : Your short film should be reached either in mp4 or mkv or mov format on or before 05.08.2026 to this mail id: cs-regular@anjaconline.org',
          '508c5cf8-d002-49a0-9898-8d2e607878ea',
          1,
          2,
          2,
          NULL,
          '8e3c00e0-1af3-46db-846c-fec14d5dfbc7',
          NULL,
          '11:00:00'::time,
          'active',
          '2026-07-10T15:42:35.891465+00:00'
        );
INSERT INTO public.events (id, event_name, category, description, rules, staff_incharge, minimum_participants, maximum_participants, team_size, prelims_venue, mains_venue, preliminary, mains, status, created_at) VALUES (
          '50000000-0000-0000-0000-000000000011',
          'Mystery Chase',
          'Treasure Hunt',
          'Clue-solving treasure hunt using QR codes placed around the campus.',
          'Team Size: 3 Participants

Preliminary will be conducted

Two Participant from a team will allow to attend the prelims.

10 teams will be selected to the next round.

QR Codes will be placed at various locations.

Each QR Code contains a clue or question.

Teams must solve the clues and locate the next QR code.

First five teams completing all clues qualify for the final round',
          '4ae4e8be-4b47-4558-b272-05dd2e609b3c',
          3,
          3,
          3,
          NULL,
          'a90facbf-0de3-4c90-8504-9234ce67f0d0',
          NULL,
          '11:00:00'::time,
          'active',
          '2026-07-10T15:42:35.891465+00:00'
        );
INSERT INTO public.events (id, event_name, category, description, rules, staff_incharge, minimum_participants, maximum_participants, team_size, prelims_venue, mains_venue, preliminary, mains, status, created_at) VALUES (
          '50000000-0000-0000-0000-000000000013',
          'Code Detox',
          'E-WASTE MODEL MAKING',
          'Craft innovative models using e-waste/raw materials to promote sustainability.',
          'Team Size: 2 Participants

Participants should bring their own e-waste/raw materials.

Component arrangement and assembly must begin only after the event has officially started.

Teams with pre-assembled components will be disqualified.

Duration is an hour.',
          '4619be33-e3a3-436c-94f0-fe23a78b5364',
          2,
          2,
          2,
          NULL,
          '1caef901-b875-48b2-8018-6c981551f005',
          NULL,
          '11:30:00'::time,
          'active',
          '2026-07-10T15:42:35.891465+00:00'
        );
INSERT INTO public.events (id, event_name, category, description, rules, staff_incharge, minimum_participants, maximum_participants, team_size, prelims_venue, mains_venue, preliminary, mains, status, created_at) VALUES (
          '50000000-0000-0000-0000-000000000012',
          'Mind Spark',
          'Technical Quiz',
          'Test your range of IT knowledge, CS fundamentals, programming concepts, and current technology trends.',
          'Two Participants per team.

Preliminary will be conducted.

Top five teams will qualify for the final round.

Questions will include:  ComputerScience Fundamentals, Programming Concepts, Current Technology Trends',
          '6e8cd011-9633-4bbe-a3b9-85a6e55c5237',
          2,
          2,
          2,
          'e9253456-92ba-4937-9f65-3882f24f4ab3',
          '8e3c00e0-1af3-46db-846c-fec14d5dfbc7',
          '11:00:00'::time,
          '02:00:00'::time,
          'active',
          '2026-07-10T15:42:35.891465+00:00'
        );
INSERT INTO public.events (id, event_name, category, description, rules, staff_incharge, minimum_participants, maximum_participants, team_size, prelims_venue, mains_venue, preliminary, mains, status, created_at) VALUES (
          '50000000-0000-0000-0000-000000000014',
          'Tech Premier League',
          'Sports Quiz',
          'An IPL-based technical and sports quiz ending in a high-stakes mock auction.',
          'Team Size: 2 Participants 

Preliminary IPL Quiz round will be conducted

Questions will be based on IPL. 

Top five teams will be selected for the final round (AUCTION). 

Prizes will be awarded to the Top Two Teams.',
          '5516e896-6b41-4091-b943-816469f45565',
          2,
          2,
          2,
          NULL,
          '1e3e11c2-0f56-4d1b-ac57-4a64ee4fb948',
          NULL,
          '11:00:00'::time,
          'active',
          '2026-07-10T15:42:35.891465+00:00'
        );

-- 6. Incharges
DELETE FROM public.incharges;
INSERT INTO public.incharges (id, name, email, event_id, created_at) VALUES ('508c5cf8-d002-49a0-9898-8d2e607878ea', 'Mr. M. SAKTHISARAVANAN M.Sc., M.Phil,', NULL, NULL, '2026-07-13T06:37:29.220609+00:00');
INSERT INTO public.incharges (id, name, email, event_id, created_at) VALUES ('4ae4e8be-4b47-4558-b272-05dd2e609b3c', 'Mrs. S. YOGALAKSHMI M.Sc., M.Phil., NET., ', NULL, NULL, '2026-07-13T06:37:44.038126+00:00');
INSERT INTO public.incharges (id, name, email, event_id, created_at) VALUES ('6e8cd011-9633-4bbe-a3b9-85a6e55c5237', 'Mrs. K. SHENBAGA PRIYA M.C.A.,', NULL, NULL, '2026-07-13T06:37:53.468116+00:00');
INSERT INTO public.incharges (id, name, email, event_id, created_at) VALUES ('15a22362-13e8-4126-a5a2-d357eafda691', 'Dr. V. JAYAKUMAR M.Sc., M.Phil., M.B.A., Ph.D.', NULL, NULL, '2026-07-13T06:38:09.703627+00:00');
INSERT INTO public.incharges (id, name, email, event_id, created_at) VALUES ('0a3f9117-3fd0-4431-9fa3-6d4d7643144e', 'Dr. R. VENGATESHKUMAR M.C.A.,M.Phil.,SET.,Ph.D.', NULL, NULL, '2026-07-13T06:38:20.267984+00:00');
INSERT INTO public.incharges (id, name, email, event_id, created_at) VALUES ('3f27bd89-58fc-4366-9a69-63ec1e99da62', 'Dr. A. DHARMARAJAN M.Sc., M.Phil., M.Tech., Ph.D.', NULL, NULL, '2026-07-13T06:38:38.597432+00:00');
INSERT INTO public.incharges (id, name, email, event_id, created_at) VALUES ('5516e896-6b41-4091-b943-816469f45565', 'Mrs. K.DEVIKALA M.C.A., B.Ed.,', NULL, NULL, '2026-07-13T06:39:16.431065+00:00');
INSERT INTO public.incharges (id, name, email, event_id, created_at) VALUES ('0d181587-b99f-4e18-a130-879c713d6394', 'Mrs. R. ANANTHAVALLI M.C.A., NET.,SET.,', NULL, NULL, '2026-07-13T06:38:56.658232+00:00');
INSERT INTO public.incharges (id, name, email, event_id, created_at) VALUES ('4619be33-e3a3-436c-94f0-fe23a78b5364', 'Ms. R. AISHWARYA LAKSHMMI M.Sc .,', NULL, NULL, '2026-07-13T06:39:48.199896+00:00');
INSERT INTO public.incharges (id, name, email, event_id, created_at) VALUES ('f7e61281-9f90-4cd1-87f5-64dfa1633a7f', 'Mr. V. VENKATESHBABU B.E. (Hons), M. Phil.,', NULL, NULL, '2026-07-13T06:40:27.369212+00:00');

-- 7. Lots
DELETE FROM public.lots;

-- 8. Storage bucket configurations
INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public Download Assets" ON storage.objects;
CREATE POLICY "Public Download Assets" ON storage.objects FOR SELECT TO public USING (bucket_id = 'assets');
DROP POLICY IF EXISTS "Public Upload Assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Assets" ON storage.objects;
CREATE POLICY "Admin Upload Assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'assets' AND current_role_name() = 'admin');
DROP POLICY IF EXISTS "Admin Update Assets" ON storage.objects;
CREATE POLICY "Admin Update Assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'assets' AND current_role_name() = 'admin') WITH CHECK (bucket_id = 'assets' AND current_role_name() = 'admin');
DROP POLICY IF EXISTS "Admin Delete Assets" ON storage.objects;
CREATE POLICY "Admin Delete Assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'assets' AND current_role_name() = 'admin');
