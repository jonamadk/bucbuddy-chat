# Bucbuddy-QnA
BucBuddy is a conversational and context-aware QnA platform designed for East Tennessee State University. 
A React-based chat application with a sidebar for chat history, voice input support, and a settings modal for enabling voice responses. This project replicates the design and functionality of a chat interface with a clean, modern UI.

---
**Features**


- **Chat Interface:** Send and receive messages with a responsive chat window
- **Chat History:** View previous messages in a sidebar
- **Voice Input:** Use the microphone to input messages (browser support required)
- **Voice Output:** Optional text-to-speech for bot responses
- **Settings Modal:** Toggle voice agent functionality
- **Responsive Design:** Flexible layout with CSS styling

---

### Project Structure
```bash
bucbuddy-chat/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── ChatWindow.js
│   │   ├── Sidebar.js
│   │   └── SettingsModal.js
│   ├── App.js
│   ├── App.css
│   └── index.js
├── .gitignore
├── package.json
└── README.md
```
---

#### Prerequisites
1. **Node.js (v16 or later recommended)** 
2. **npm (comes with Node.js)**
3. **A modern web browser (Chrome, Firefox, etc.) for voice features**
   
#### Installation
1. **Clone the Repository (if applicable):**
```bash
git clone <repository-url>
cd bucbuddy-chat
```
1. **Build Docker Image and run the application**
```bash
docker build -t bucbuddy-chat .
docker run -p 3000:3000 bucbuddy-chat
```

The app will start in development mode and open at http://localhost:3000

#### Usage
**Sending Messages:** Type in the textarea and press Enter or click the paper plane button
**Voice Input:** Click the microphone button to start/stop voice recording (turns red when active)
**Settings:** Click the cog icon (top-right) to open the settings modal. Enable "Voice Agent" to hear bot responses aloud
**History:** View past queries in the sidebar on the left


#### Acknowledgments
``` Built with Create React App
Inspired by modern chat application designs

```