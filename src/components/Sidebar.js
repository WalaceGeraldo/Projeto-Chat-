import React from 'react';

// Recebe 'onlineUsers' como um array de objetos: [{ name: '...', status: '...', id: '...' }]
function Sidebar({ currentUser, channels, onlineUsers, activeChannel, onSelectChannel, onLogout, unreadCounts }) {

  // Logs para depuração (podem ser removidos depois)
  console.log('Sidebar Recebeu onlineUsers:', onlineUsers);
  console.log('Sidebar onlineUsers.length:', Array.isArray(onlineUsers) ? onlineUsers.length : 'Não é array');

  return (
    <aside className="sidebar">
      {/* Cabeçalho */}
      <div className="sidebar-header">
        <i className="fas fa-comments"></i>
        <h3>Site Chat</h3>
      </div>

      {/* Seção de Canais */}
      <div className="sidebar-section">
        <h4>Canais</h4>
        <ul className="channel-list">
          {channels.map((channel) => {
            const conversationId = channel.id || channel.name;
            const count = unreadCounts[conversationId] || 0;
            return (
              <li
                key={'channel-' + channel.id}
                className={activeChannel && activeChannel.id === channel.id && activeChannel.type !== 'dm' ? 'active' : ''}
                onClick={() => onSelectChannel(channel)}
              >
                <span># {channel.name}</span>
                {count > 0 && <span className="unread-badge">{count > 9 ? '9+' : count}</span>}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Seção de Usuários Online */}
      <div className="sidebar-section">
        {/* --- MODIFICAÇÃO TEMPORÁRIA AQUI --- */}
        <h4>Usuários Online ({onlineUsers.length})</h4>
        {/* ---------------------------------- */}
        <ul className="channel-list">
          {/* Adicionando verificação Array.isArray aqui também por segurança */}
          {Array.isArray(onlineUsers) && onlineUsers.map((userObj) => {
            const conversationId = 'dm-' + userObj.id;
            const count = unreadCounts[conversationId] || 0;
            return (
              userObj.name !== currentUser && (
                <li
                  key={'dm-' + userObj.id}
                  className={`${userObj.status === 'idle' ? 'idle-user' : ''} ${activeChannel && activeChannel.id === userObj.id && activeChannel.type === 'dm' ? 'active' : ''}`}
                  onClick={() => onSelectChannel({ type: 'dm', name: userObj.name, id: userObj.id })}
                >
                  <span className={`status-dot ${userObj.status === 'idle' ? 'idle' : 'online'}`}></span>
                  <span>{userObj.name}</span>
                  {userObj.status === 'idle' ? <span className="idle-text"> (Ausente)</span> : ''}
                  {count > 0 && <span className="unread-badge">{count > 9 ? '9+' : count}</span>}
                </li>
              )
            );
          })}
        </ul>
      </div>

      {/* Rodapé */}
      <div className="sidebar-footer">
        <div className="user-profile">
          <span className="status-dot online"></span>
          <strong>{currentUser}</strong>
        </div>
        <button className="logout-button" onClick={onLogout} title="Sair">
          <i className="fas fa-sign-out-alt"></i>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;