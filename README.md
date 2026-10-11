# WATJAI — 20 ข้อวัดใจ

เว็บแบบทดสอบภาษาไทยแบบ static ใช้ GitHub Pages + Supabase

## ฟีเจอร์ในชุดนี้
- สร้างแบบทดสอบได้ 1–20 ข้อ (ค่าเริ่มต้นมี 5 ข้อให้แก้ไข)
- 4 ตัวเลือกต่อข้อ เลือกคำตอบที่ถูกต้องได้
- เผยแพร่และสร้างลิงก์แชร์เฉพาะแบบทดสอบ
- ผู้เล่นตอบคำถามและเห็นคะแนน
- บันทึกคะแนนออนไลน์
- เจ้าของดูคะแนนของแบบทดสอบตัวเองได้
- ปรับหน้าเว็บให้เหมาะกับมือถือและแท็บเล็ต มีแอนิเมชัน

## ขั้นที่ 1: สร้างโปรเจกต์ Supabase
1. เข้า https://supabase.com/ แล้วสร้างโปรเจกต์
2. ไปที่ **Authentication → Sign In / Providers** แล้วเปิด **Anonymous Sign-Ins** (ชื่อเมนูอาจต่างกันเล็กน้อยตามหน้าตา Dashboard)
3. ไปที่ **SQL Editor** สร้าง query ใหม่ เปิดไฟล์ `supabase-schema.sql` คัดลอกทั้งหมดไปวาง แล้วกด Run
4. ไปที่ **Project Settings → API Keys** หรือปุ่ม **Connect** แล้วคัดลอก:
   - Project URL
   - Publishable key (`sb_publishable_...`) สำหรับเว็บเบราว์เซอร์
5. ห้ามใช้ `sb_secret_...` หรือ `service_role` key ในไฟล์เว็บเด็ดขาด

เอกสารทางการ:
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/database/secure-data
- https://supabase.com/docs/guides/auth/auth-anonymous

## ขั้นที่ 2: ตั้งค่าเว็บ
1. เปิด `app.js` ด้วยตัวแก้ไขข้อความ
2. ค่า Supabase ของคุณถูกใส่ไว้ใน `app.js` ให้แล้ว หากสร้าง ZIP นี้ใหม่หรือแก้ค่าด้วยตนเอง ให้ใช้ Project URL และ Publishable key ของโปรเจกต์คุณ:

   `const SUPABASE_URL = "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE";`

   `const SUPABASE_PUBLISHABLE_KEY = "PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE";`

3. ใช้ publishable key เท่านั้นในเว็บสาธารณะ ต้องใช้ RLS ตาม SQL ที่ให้มา
4. บันทึกไฟล์

## ขั้นที่ 3: เผยแพร่ด้วย GitHub Pages (ทำจากแท็บเล็ตได้)
1. เข้า https://github.com/new และสร้าง repository เช่น `watjai-quiz`
2. ตั้งเป็น **Public** (GitHub Pages แบบฟรีใช้ง่ายสุดกับ public repo)
3. กด **Add file → Upload files**
4. อัปโหลด `index.html`, `style.css`, `app.js`, `supabase-schema.sql`, `README.md`
5. กด **Commit changes**
6. เข้า **Settings → Pages**
7. ใน **Build and deployment** เลือก **Deploy from a branch**
8. เลือก branch `main` และ folder `/(root)` แล้วกด **Save**
9. รอการ deploy แล้วเปิดลิงก์ที่ GitHub Pages แสดง (รูปแบบมักเป็น `https://ชื่อผู้ใช้.github.io/watjai-quiz/`)

เอกสาร GitHub: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## ขั้นที่ 4: ทดสอบ
1. เปิดเว็บ GitHub Pages แล้วกด “สร้างแบบทดสอบ”
2. แก้คำถาม 5 ข้อเริ่มต้น หรือเพิ่มได้สูงสุด 20 ข้อ
3. เลือกวงกลมหน้าตัวเลือกที่เป็นคำตอบถูกต้องในแต่ละข้อ
4. กด “สร้างและรับลิงก์”
5. เปิดลิงก์ในแท็บใหม่หรือส่งให้เพื่อนทดสอบ
6. หลังเพื่อนบันทึกคะแนน ให้เปิดเว็บในเบราว์เซอร์เดิมที่ใช้สร้างแบบทดสอบ แล้วเลือก “ดูคะแนนผู้เล่น”

## ข้อควรรู้
- MVP นี้ใช้ Supabase Anonymous Auth เพื่อให้มี user ID โดยไม่ต้องให้ผู้เล่นกรอกอีเมล/รหัสผ่าน
- ข้อมูลเจ้าของแบบทดสอบผูกกับ user ของเบราว์เซอร์นั้น หากล้างข้อมูลเว็บไซต์หรือเปลี่ยนเบราว์เซอร์ อาจเสียสิทธิ์เข้าถึงแบบทดสอบเดิมได้ ควรเพิ่มระบบบัญชีจริงก่อนใช้จริงจัง
- คะแนนคำนวณในหน้าเว็บ ดังนั้นไม่ควรใช้กับรางวัล การแข่งขันจริง หรือข้อมูลที่ต้องป้องกันการโกง ผู้เล่นที่ดัดแปลงหน้าเว็บอาจส่งคะแนนที่ไม่ตรงกับคำตอบจริงได้
- แบบทดสอบที่เผยแพร่เป็นสาธารณะ คนที่มีลิงก์เข้าถึงได้ อย่าใส่ข้อมูลส่วนตัวหรือข้อมูลลับ
- คีย์ publishable เป็นคีย์สาธารณะ แต่ต้องไม่เปิดเผย secret/service_role key และต้องคง RLS ไว้
- GitHub Pages เป็น static hosting จึงไม่รันโค้ด backend ของ Node/Python/PHP โดยตรง

## ติดต่อ
Instagram: https://www.instagram.com/_.tubsongautistic2?exln=bzV5ODZyMHZmcTMy
