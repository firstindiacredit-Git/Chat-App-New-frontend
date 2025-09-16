# ChatApp - Mobile Chat Application

A WhatsApp-like mobile chat application built with React and Vite, featuring email-based authentication with OTP verification.

## Features

- **Mobile-First Design**: Optimized for mobile devices with responsive UI
- **Email Authentication**: Login using email with OTP verification
- **User Registration**: Signup with name, phone, bio, and email
- **WhatsApp-like Interface**: Modern chat UI with message bubbles, online status, and unread badges
- **Real-time Messaging**: Interactive chat interface with message history
- **Profile Management**: User profile with logout functionality

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Navigate to the Frontend directory:
```bash
cd Frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and visit `http://localhost:3000`

## Usage

### Login Flow
1. Enter your email address
2. Click "Send Verification Code"
3. Enter the 6-digit OTP code
4. Access the chat interface

### Signup Flow
1. Fill in your details (name, phone, bio, email)
2. Click "Create Account"
3. Enter the 6-digit OTP code sent to your email
4. Start chatting

### Chat Features
- View chat list with online status indicators
- Send and receive messages in real-time
- Access profile information
- Logout functionality

## Project Structure

```
Frontend/
├── src/
│   ├── components/
│   │   ├── Login.jsx          # Login form with email input
│   │   ├── Signup.jsx         # Registration form
│   │   ├── OTPVerification.jsx # OTP verification component
│   │   └── Chat.jsx           # Main chat interface
│   ├── App.jsx                # Main app with routing
│   ├── App.css                # Global styles and chat UI
│   ├── index.css              # Base styles
│   └── main.jsx               # App entry point
├── package.json
├── vite.config.js
└── index.html
```

## Technologies Used

- **React 18**: Modern React with hooks
- **React Router DOM**: Client-side routing
- **Vite**: Fast build tool and dev server
- **CSS3**: Mobile-first responsive design
- **JavaScript ES6+**: Modern JavaScript features

## Mobile Optimizations

- Touch-friendly interface with proper button sizes
- Responsive design for various screen sizes
- Optimized input fields to prevent zoom on iOS
- Smooth scrolling and animations
- WhatsApp-inspired color scheme and layout

## Demo Features

The application includes demo data for testing:
- Sample chat conversations
- Mock user profiles
- Simulated OTP verification (accepts any 6-digit code)

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

This project is for demonstration purposes.