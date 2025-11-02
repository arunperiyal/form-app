# Quick Reference Guide

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
npm run setup

# 3. Start server
npm start
```

## 📝 Common Commands

```bash
# Development with auto-reload
npm run dev

# Interactive setup
npm run setup

# View logs in real-time
tail -f logs/combined.log

# View errors only
tail -f logs/error.log
```

## 🔐 Environment Variables

Required in `.env` file:

```env
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_generated_secret
```

Generate JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 🔒 Security Features

### Rate Limits
- **General API**: 100 requests / 15 minutes / IP
- **Admin Login**: 5 attempts / 15 minutes / IP

### Security Headers
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options
- ✅ Content-Security-Policy
- ✅ Strict-Transport-Security

### Input Validation
- Server-side validation on all inputs
- XSS protection via sanitization
- Type checking and format validation

## 📊 Monitoring

### Check Logs
```bash
# Last 100 lines
tail -n 100 logs/combined.log

# Follow in real-time
tail -f logs/combined.log

# Only errors
grep "error" logs/combined.log
```

### Log Locations
- `logs/combined.log` - All logs
- `logs/error.log` - Errors only

## 🐛 Troubleshooting

### Server won't start
```bash
# Error: Missing required environment variables
# Solution:
npm run setup
```

### Too many requests
```bash
# Error: Too many requests from this IP
# Solution: Wait 15 minutes or adjust rate limits in server.js
```

### Validation errors
```bash
# Solution: Check middleware/validation.js for rules
# Or adjust your input to match requirements
```

## 🔧 Configuration

### Adjust Rate Limits
Edit `server.js` lines 114-126:
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100  // Change this number
});
```

### Adjust Validation Rules
Edit `middleware/validation.js`:
```javascript
body('shortAnswer')
  .isLength({ min: 3, max: 500 })  // Change these
```

### Adjust File Upload Limits
Edit `.env`:
```env
MAX_FILE_SIZE=1048576  # 1MB in bytes
```

## 📁 Project Structure

```
personal_form/
├── config/           # Configuration
├── middleware/       # Express middleware
├── utils/           # Utility functions
├── scripts/         # Helper scripts
├── public/          # Frontend files
├── logs/            # Application logs
├── uploads/         # Uploaded files
└── docs/            # Documentation
```

## 🌐 Endpoints

### Public
- `GET /` - User form
- `POST /submit-form` - Submit form

### Admin (requires auth)
- `GET /admin` - Admin panel
- `POST /admin/login` - Login
- `GET /admin/submissions` - List submissions
- `DELETE /admin/submissions/:id` - Delete
- `GET /admin/export-csv` - Export CSV

## 🔑 Admin Panel

**URL**: `http://localhost:3000/admin`

**Login**: Use password from `.env` file

**Features**:
- View all submissions (paginated)
- Delete submissions
- Export to CSV
- Download uploaded files

## 📦 Dependencies

### Production
- express - Web framework
- sqlite3 - Database
- multer - File uploads
- jsonwebtoken - Authentication
- dotenv - Environment variables
- helmet - Security headers
- express-rate-limit - Rate limiting
- express-validator - Input validation
- winston - Logging

### Development
- nodemon - Auto-reload

## 🚨 Important Notes

1. **Never commit `.env` file** - It's in `.gitignore`
2. **Change default password** - Set strong password in `.env`
3. **Use HTTPS in production** - Set up reverse proxy
4. **Monitor logs regularly** - Check for errors and attacks
5. **Keep dependencies updated** - Run `npm audit` regularly

## 📚 Documentation Files

- `README.md` - Main documentation
- `docs/CODE_IMPROVEMENTS.md` - Future improvements
- `docs/IMPLEMENTATION_SUMMARY.md` - What's implemented
- `docs/UPGRADE_GUIDE.md` - Upgrade instructions
- `docs/COMPLETION_REPORT.md` - Final report
- `docs/QUICK_REFERENCE.md` - This file

## 🆘 Need Help?

1. Check the logs: `tail -f logs/combined.log`
2. Review documentation in `docs/` folder
3. Check troubleshooting section above
4. Verify environment variables are set

## ✅ Quick Health Check

```bash
# Start server
npm start

# In another terminal, test:
curl http://localhost:3000/
# Should return HTML

curl -I http://localhost:3000/
# Should show security headers

# Check logs
tail logs/combined.log
# Should show startup messages
```

## 🎯 Production Checklist

Before deploying to production:

- [ ] Set strong `ADMIN_PASSWORD` (12+ chars)
- [ ] Generate secure `JWT_SECRET`
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS
- [ ] Review rate limits
- [ ] Set up log monitoring
- [ ] Configure firewall
- [ ] Set up database backups
- [ ] Test all endpoints
- [ ] Verify `.env` not in git

## 💡 Tips

### Performance
- Logs rotate automatically (5MB, 5 files)
- Rate limiting prevents overload
- Validation happens before database operations

### Security
- All inputs are validated and sanitized
- Security headers protect against common attacks
- Rate limiting prevents brute force
- Errors don't leak sensitive information

### Development
- Use `npm run dev` for auto-reload
- Check logs for debugging
- Adjust validation rules as needed
- Test rate limiting in development

---

**Made with ❤️ for secure applications**
