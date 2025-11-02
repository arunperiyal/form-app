# Flexible Form System

A **production-ready** full-stack web application featuring a customizable form with an admin panel for managing submissions. Built with Node.js, Express, and SQLite with enterprise-grade security features.

## ✨ Key Features

### User-Facing Form
- **Multiple Input Types**: Short answer, long answer, checkboxes, radio buttons, date, time, phone, email, number, website, scale, dropdown, and file upload
- **File Upload Support**: Accept PDF, JPG, and PNG files (max 1MB)
- **Client-Side Validation**: Real-time form validation with error messages
- **Server-Side Validation**: Comprehensive input validation and sanitization
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### Admin Panel
- **Secure Authentication**: JWT-based authentication with password protection
- **Rate Limited**: Protection against brute force attacks
- **View Submissions**: Paginated view of all form submissions
- **Delete Submissions**: Remove individual submissions and associated files
- **Export to CSV**: Download all submissions as a CSV file
- **File Management**: View and download uploaded files

### Security Features 🔒
- **Helmet.js**: Security headers including CSP, XSS protection
- **Rate Limiting**: Prevents brute force and DoS attacks
- **Input Validation**: Server-side validation with express-validator
- **Input Sanitization**: XSS attack prevention
- **Error Handling**: Professional error handling without information leakage
- **Logging**: Comprehensive logging with Winston
- **Environment Variables**: Secure configuration management

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **File Upload**: Multer
- **Authentication**: JSON Web Tokens (JWT)
- **Security**: Helmet, express-rate-limit, express-validator
- **Logging**: Winston
- **Configuration**: dotenv
- **Frontend**: Vanilla HTML, CSS, JavaScript

## Quick Start

### Prerequisites
- Node.js >= 16.0.0
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd personal_form
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the application**
   
   Run the interactive setup:
   ```bash
   npm run setup
   ```
   
   Or manually create `.env` from template:
   ```bash
   cp .env.example .env
   # Edit .env and set your ADMIN_PASSWORD and JWT_SECRET
   ```

4. **Start the server**
   
   For production:
   ```bash
   npm start
   ```
   
   For development (with auto-reload):
   ```bash
   npm run dev
   ```

5. **Access the application**
   - User Form: `http://localhost:3000/`
   - Admin Panel: `http://localhost:3000/admin`

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `3000` | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `ADMIN_PASSWORD` | Admin panel password | - | **Yes** |
| `JWT_SECRET` | JWT signing secret | - | **Yes** |
| `DB_PATH` | Database file path | `./responses.db` | No |
| `MAX_FILE_SIZE` | Max upload size in bytes | `1048576` (1MB) | No |

**Generate a secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Project Structure

```
personal_form/
├── config/              # Configuration files
│   └── logger.js        # Winston logger setup
├── middleware/          # Express middleware
│   ├── errorHandler.js  # Error handling
│   └── validation.js    # Input validation
├── utils/               # Utility functions
│   └── auth.js          # Authentication helpers
├── scripts/             # Utility scripts
│   └── setup.js         # Interactive setup
├── public/              # Frontend files
│   ├── index.html       # User form page
│   ├── admin.html       # Admin panel page
│   ├── styles.css       # User form styles
│   ├── script.js        # User form logic
│   ├── admin.css        # Admin panel styles
│   └── admin.js         # Admin panel logic
├── logs/                # Application logs
├── uploads/             # Uploaded files storage
├── docs/                # Documentation
│   ├── CODE_IMPROVEMENTS.md    # Improvement suggestions
│   ├── IMPLEMENTATION_SUMMARY.md  # What's been implemented
│   └── UPGRADE_GUIDE.md        # Upgrade instructions
├── server.js            # Main server file
├── database.js          # Database helper class
├── responses.db         # SQLite database
├── .env                 # Environment variables (not in git)
├── .env.example         # Environment template
├── package.json         # Dependencies
└── README.md            # This file
```

## API Endpoints

### Public Endpoints

- `GET /` - User form page
- `POST /submit-form` - Submit form data

### Admin Endpoints (Authentication Required)

- `GET /admin` - Admin panel page
- `POST /admin/login` - Admin authentication
- `GET /admin/submissions` - Get submissions (with pagination)
- `DELETE /admin/submissions/:id` - Delete a submission
- `GET /admin/export-csv` - Export submissions as CSV

## Database Schema

### Submissions Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key (auto-increment) |
| `shortAnswer` | TEXT | Short text input |
| `longAnswer` | TEXT | Long text input |
| `multiSelect` | TEXT | JSON array of checkbox selections |
| `singleSelect` | TEXT | Radio button selection |
| `date` | TEXT | Date input |
| `time` | TEXT | Time input |
| `phone` | TEXT | Phone number |
| `email` | TEXT | Email address |
| `number` | INTEGER | Numeric input |
| `website` | TEXT | Website URL |
| `scale` | INTEGER | Scale/range input |
| `dropdown` | TEXT | Dropdown selection |
| `file` | TEXT | Uploaded filename |
| `created_at` | TIMESTAMP | Submission timestamp |

## Security Features

### Built-in Protection

1. **Helmet.js Security Headers**
   - X-Frame-Options (clickjacking protection)
   - X-Content-Type-Options (MIME sniffing protection)
   - Content-Security-Policy (XSS protection)
   - Strict-Transport-Security (HTTPS enforcement)

2. **Rate Limiting**
   - General API: 100 requests per 15 minutes per IP
   - Login endpoint: 5 attempts per 15 minutes per IP
   - Protects against brute force and DoS attacks

3. **Input Validation & Sanitization**
   - Server-side validation for all inputs
   - HTML escaping to prevent XSS
   - Email normalization
   - URL validation

4. **Authentication**
   - JWT-based authentication
   - Token expiration (2 hours)
   - Secure password handling (ready for bcrypt)

5. **Error Handling**
   - No stack traces in production
   - Structured error logging
   - Graceful error messages

6. **File Upload Security**
   - Type validation (PDF, JPG, PNG only)
   - Size limits (1MB default)
   - Safe file naming

### Logging

All activities are logged to `logs/` directory:
- `error.log` - Error-level logs only
- `combined.log` - All logs

Logs include:
- Timestamps
- Request details (URL, method, IP)
- Error messages and stack traces
- Login attempts (success and failure)

## Development

### Prerequisites

- Node.js >= 16.0.0
- npm or yarn

### Scripts

```bash
# Start production server
npm start

# Start development server with auto-reload
npm run dev

# Run interactive setup
npm run setup
```

### Running in Development Mode

```bash
npm run dev
```

This uses `nodemon` to automatically restart the server when files change.

### Monitoring Logs

```bash
# View all logs
tail -f logs/combined.log

# View errors only
tail -f logs/error.log

# View last 100 lines
tail -n 100 logs/combined.log
```

## Production Deployment

### Environment Setup

1. Set secure environment variables:
   ```bash
   export NODE_ENV=production
   export ADMIN_PASSWORD="your_secure_password"
   export JWT_SECRET="your_secret_key"
   export PORT=3000
   ```

2. Or use a `.env` file (recommended):
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start server.js --name "form-system"

# Enable startup script
pm2 startup

# Save process list
pm2 save

# Monitor
pm2 monit

# View logs
pm2 logs form-system
```

### Using Docker (Optional)

Create a `Dockerfile`:
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t form-system .
docker run -p 3000:3000 --env-file .env form-system
```

### Security Checklist

Before deploying to production:

- [ ] Set strong `ADMIN_PASSWORD` (min 12 characters)
- [ ] Generate secure `JWT_SECRET` (64+ bytes)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS/SSL
- [ ] Review rate limits and adjust if needed
- [ ] Set up log rotation and monitoring
- [ ] Configure firewall rules
- [ ] Set up regular database backups
- [ ] Review and test all endpoints
- [ ] Ensure `.env` is in `.gitignore`

## Troubleshooting

### Server won't start

**Error**: "Missing required environment variables"

**Solution**: Create `.env` file:
```bash
npm run setup
# or
cp .env.example .env
# Edit .env and set ADMIN_PASSWORD and JWT_SECRET
```

### Too many requests

**Error**: "Too many requests from this IP"

**Solution**: 
- Wait 15 minutes for rate limit reset
- Or adjust limits in `server.js` (lines ~114-126)

### Validation errors

**Error**: "Short answer must be between 3 and 500 characters"

**Solution**: Adjust validation rules in `middleware/validation.js`

### Cannot find module

**Error**: "Cannot find module 'winston'"

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Documentation

- [CODE_IMPROVEMENTS.md](docs/CODE_IMPROVEMENTS.md) - Detailed list of potential improvements
- [IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md) - What has been implemented
- [UPGRADE_GUIDE.md](docs/UPGRADE_GUIDE.md) - How to upgrade from previous versions

## Changelog

### Version 2.0.0 (Current)

**Security Enhancements:**
- ✅ Added Helmet.js for security headers
- ✅ Implemented rate limiting
- ✅ Added comprehensive input validation
- ✅ Implemented input sanitization

**Code Quality:**
- ✅ Added Winston logging
- ✅ Centralized error handling
- ✅ Better code organization
- ✅ Environment variable validation

**Developer Experience:**
- ✅ Interactive setup script
- ✅ Comprehensive documentation
- ✅ Better error messages
- ✅ Improved logging

### Version 1.0.0

- Initial release with basic form and admin panel

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all security checks pass
5. Test thoroughly before submitting

## Support

For issues, questions, or contributions:
- Check the [documentation](docs/)
- Review [troubleshooting](#troubleshooting) section
- Check logs in `logs/` directory

---

**Made with ❤️ for secure and maintainable web applications**
