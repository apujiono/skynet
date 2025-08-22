import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000');

function App() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) setToken(savedToken);
  }, []);

  useEffect(() => {
    if (token) {
      fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat/users`, {
        headers: { 'x-auth-token': token }
      })
        .then(res => res.json())
        .then(data => {
          setUsers(data);
          setUser(data.find(u => u._id === JSON.parse(atob(token.split('.')[1])).id));
        });

      fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat/messages`, {
        headers: { 'x-auth-token': token }
      })
        .then(res => res.json())
        .then(setMessages);
    }
  }, [token]);

  useEffect(() => {
    socket.on('receive-message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('user-online', (userId) => {
      setOnlineUsers(prev => new Set([...prev, userId]));
    });

    socket.on('user-offline', (userId) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    return () => {
      socket.off('receive-message');
      socket.off('user-online');
      socket.off('user-offline');
    };
  }, []);

  const sendMessage = () => {
    if (!input.trim()) return;
    const data = {
      sender: user._id,
      receiver: null,
      content: input,
      chatType: 'group'
    };
    socket.emit('send-message', data);
    setInput('');
  };

  const login = (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
      localStorage.setItem('token', data.token);
      setToken(data.token);
    });
  };

  const register = (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const email = e.target.email.value;
    const password = e.target.password.value;
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    })
    .then(res => res.json())
    .then(() => alert('User created! Login now.'));
  };

  if (!token) {
    return (
      <div className="auth">
        <h2>SkyNet Chat</h2>
        <form onSubmit={login}>
          <h3>Login</h3>
          <input name="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" required />
          <button type="submit">Login</button>
        </form>
        <form onSubmit={register}>
          <h3>Register</h3>
          <input name="username" placeholder="Username" required />
          <input name="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" required />
          <button type="submit">Register</button>
        </form>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h2>SkyNet Chat - Welcome, {user?.username}</h2>
      <div className="sidebar">
        <h3>Users</h3>
        {users.map(u => (
          <div key={u._id} className={`user ${onlineUsers.has(u._id) ? 'online' : 'offline'}`}>
            {u.username} ({onlineUsers.has(u._id) ? 'Online' : 'Offline'})
          </div>
        ))}
      </div>
      <div className="chat">
        <div className="messages">
          {messages.map(msg => (
            <div key={msg._id} className="message">
              <strong>{msg.sender?.username}:</strong> {msg.content}
            </div>
          ))}
        </div>
        <div className="input-area">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default App;
