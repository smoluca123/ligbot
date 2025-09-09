# Database Setup Guide

## Tổng quan

Bot Discord đã được tích hợp với Prisma ORM và PostgreSQL để lưu trữ lịch sử tin nhắn của users.

## Cấu hình Database

### 1. Cài đặt dependencies

```bash
npm install prisma @prisma/client
```

### 2. Cấu hình environment variables

Tạo file `.env` với nội dung:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/discord_bot_db"
OPENROUTER_API_KEY="your_openrouter_api_key"
DISCORD_TOKEN="your_discord_bot_token"
```

### 3. Tạo database

```bash
# Tạo database migration
npx prisma migrate dev --name init

# Hoặc push schema trực tiếp (development)
npx prisma db push
```

### 4. Generate Prisma client

```bash
npx prisma generate
```

## Schema Database

### User Table

- `id`: Primary key (CUID)
- `discord_id`: Discord user ID (unique)
- `username`: Discord username
- `created_at`: Thời gian tạo
- `updated_at`: Thời gian cập nhật cuối

### MessageHistory Table

- `id`: Primary key (CUID)
- `user_id`: Foreign key đến User table
- `user_message`: Tin nhắn của user
- `bot_response`: Phản hồi của bot
- `created_at`: Thời gian tạo

## Tính năng

### 1. Auto User Creation

- Tự động tạo user khi chưa có trong database
- Cập nhật username khi thay đổi
- Fallback mode khi database không kết nối được

### 2. Message History

- Lưu trữ 10 tin nhắn gần nhất cho mỗi user
- Tự động xóa tin nhắn cũ hơn
- Context awareness cho AI

### 3. Error Handling

- Graceful fallback khi database down
- Connection testing
- Detailed error logging

## Commands

### `/msg message:your_message`

- Chat với Lig (có nhớ lịch sử)
- Tự động tạo user nếu chưa có
- Lưu tin nhắn vào database

### `/history`

- Xem lịch sử chat với Lig
- Hiển thị 5 tin nhắn gần nhất
- Thông báo nếu chưa có lịch sử

### `/dbtest`

- Test database connection
- Hiển thị thống kê database
- Monitor performance

## Troubleshooting

### Database Connection Failed

1. Kiểm tra `DATABASE_URL` trong `.env`
2. Đảm bảo PostgreSQL đang chạy
3. Kiểm tra credentials và permissions
4. Chạy `/dbtest` để debug

### User Not Found Error

- Bot sẽ tự động tạo user mới
- Fallback mode sẽ hoạt động nếu database down
- Không cần can thiệp thủ công

### Performance Issues

- Database chỉ lưu 10 tin nhắn gần nhất
- Sử dụng indexes cho queries
- Connection pooling được enable

## Production Deployment

### 1. Environment Variables

```env
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"
NODE_ENV="production"
```

### 2. Database Migration

```bash
npx prisma migrate deploy
```

### 3. Health Check

- Endpoint: `/health`
- Kiểm tra bot status và database connection
- Monitor memory usage và uptime
