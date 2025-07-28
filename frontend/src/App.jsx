import { useEffect, useState } from "react";
import { BlobServiceClient } from "@azure/storage-blob";

// 🔐 Your Azure Storage configuration
const sasToken = "sv=2024-11-04&ss=bfqt&srt=co&sp=rwdlacupiytfx&se=2025-08-08T18:38:06Z&st=2025-07-28T10:23:06Z&spr=https&sig=cv2XKdqGzK%2FfCnV20E8dAqEqJlkQiqH3vYLKdevq5oA%3D";
const containerName = "frontend-blob";
const storageAccountName = "klarifaibbsrblob";

// Check if configuration is complete
const isConfigured = !sasToken.includes('<') && 
                    !containerName.includes('<') && 
                    !containerName.includes('YOUR_') &&
                    !storageAccountName.includes('<');

let blobServiceClient, containerClient;

if (isConfigured) {
  blobServiceClient = new BlobServiceClient(
    `https://${storageAccountName}.blob.core.windows.net/?${sasToken}`
  );
  containerClient = blobServiceClient.getContainerClient(containerName);
}

// Theme context
const useTheme = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e) => setIsDark(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  return { isDark, setIsDark };
};

// Tree node component for folder selection
const FolderTreeNode = ({ node, level = 0, onToggle, selectedFolder, onSelectFolder, isDark }) => {
  const indent = level * 20;
  const isSelected = selectedFolder === node.path;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div 
        className={`folder-node ${isSelected ? 'selected' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          padding: '8px 12px',
          paddingLeft: `${indent + 12}px`,
          borderRadius: '8px',
          transition: 'all 0.2s ease',
          backgroundColor: isSelected 
            ? (isDark ? 'rgba(37, 99, 235, 0.3)' : '#e3f2fd')
            : 'transparent',
          color: isSelected 
            ? (isDark ? '#93c5fd' : '#1976d2')
            : (isDark ? '#e5e7eb' : '#333'),
        }}
        onClick={() => onSelectFolder(node.path)}
      >
        {hasChildren && (
          <span 
            onClick={(e) => { 
              e.stopPropagation(); 
              onToggle(node.path); 
            }}
            style={{
              marginRight: '8px',
              fontWeight: 'bold',
              fontSize: '16px',
              color: isDark ? '#9ca3af' : '#666',
              cursor: 'pointer',
              minWidth: '16px'
            }}
          >
            {node.expanded ? '−' : '+'}
          </span>
        )}
        {!hasChildren && <span style={{ marginRight: '8px', width: '16px' }}></span>}
        <span style={{ marginRight: '8px', fontSize: '16px' }}>📁</span>
        <span style={{ fontSize: '14px', wordBreak: 'break-all' }}>
          {node.name}
        </span>
      </div>
      {hasChildren && node.expanded && (
        <div>
          {node.children.map((child, index) => (
            <FolderTreeNode 
              key={index}
              node={child} 
              level={level + 1}
              onToggle={onToggle}
              selectedFolder={selectedFolder}
              onSelectFolder={onSelectFolder}
              isDark={isDark}
            />
          ))}
        </div>
      )}
    </div>
  );
};

function App() {
  const { isDark, setIsDark } = useTheme();
  const [folderTree, setFolderTree] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Show configuration message if not fully configured
  if (!isConfigured) {
    return (
      <div style={{
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: '600px',
        margin: '2rem auto',
        backgroundColor: isDark ? 'rgba(251, 146, 60, 0.1)' : '#fff3e0',
        borderRadius: '10px',
        border: `2px solid ${isDark ? '#ea580c' : '#ff9800'}`,
        color: isDark ? '#fed7aa' : '#e65100'
      }}>
        <h2 style={{ color: isDark ? '#fb923c' : '#ef6c00', marginBottom: '1rem' }}>⚙️ Configuration Status</h2>
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ color: isDark ? '#86efac' : '#2e7d32', marginBottom: '0.5rem' }}>✅ Completed:</h3>
          <ul style={{ paddingLeft: '1.5rem' }}>
            <li>✅ Storage Account Name: <code style={{ 
              backgroundColor: isDark ? '#374151' : '#f5f5f5', 
              padding: '2px 6px', 
              borderRadius: '4px' 
            }}>klarifainewblob</code></li>
            <li>✅ SAS Token: {sasToken.includes('xxxxx') ? '❌ Please replace xxxxx with full token' : '✅ Configured'}</li>
          </ul>
        </div>
        
        <div style={{
          padding: '1rem',
          backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#e3f2fd',
          borderRadius: '8px',
          border: `1px solid ${isDark ? '#3b82f6' : '#2196f3'}`,
          marginTop: '1rem'
        }}>
          <h4 style={{ color: isDark ? '#93c5fd' : '#1565c0', marginBottom: '0.5rem' }}>🔍 How to find your Container Name:</h4>
          <ol style={{ paddingLeft: '1.5rem', color: isDark ? '#bfdbfe' : '#1976d2' }}>
            <li>Go to your Azure Storage Account: <strong>klarifainewblob</strong></li>
            <li>Click on "Containers" in the left menu</li>
            <li>You'll see a list of containers (e.g., "uploads", "files", "documents")</li>
            <li>Copy the name of the container you want to use</li>
            <li>Replace the container name in the code with that name</li>
          </ol>
        </div>
      </div>
    );
  }

  // Build folder tree structure
  const buildFolderTree = (folderList) => {
    const tree = { name: 'Root', path: '', children: [], expanded: true };
    const pathMap = { '': tree };

    folderList.forEach(folderPath => {
      const pathParts = folderPath.split('/');
      let currentPath = '';
      
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!pathMap[currentPath]) {
          const node = {
            name: part,
            path: currentPath,
            expanded: false,
            children: []
          };
          
          pathMap[currentPath] = node;
          if (pathMap[parentPath]) {
            pathMap[parentPath].children.push(node);
          }
        }
      }
    });

    // Sort children alphabetically
    const sortChildren = (node) => {
      if (node.children) {
        node.children.sort((a, b) => a.name.localeCompare(b.name));
        node.children.forEach(sortChildren);
      }
    };
    
    sortChildren(tree);
    return tree;
  };

  // 🔄 Load folders with nested structure
  const loadFolders = async () => {
    setIsLoading(true);
    setStatus("🔄 Loading folders from Azure...");
    
    try {
      const prefixSet = new Set();
      for await (const blob of containerClient.listBlobsFlat()) {
        // Extract all folder levels
        const pathParts = blob.name.split("/");
        for (let i = 1; i <= pathParts.length - 1; i++) {
          const folderPath = pathParts.slice(0, i).join("/");
          if (folderPath && !folderPath.endsWith('.placeholder')) {
            prefixSet.add(folderPath);
          }
        }
      }
      
      const sortedFolders = Array.from(prefixSet).sort();
      const tree = buildFolderTree(sortedFolders);
      setFolderTree(tree);
      setStatus("✅ Folders loaded successfully!");
      setTimeout(() => setStatus(""), 3000);
    } catch (error) {
      console.error("Failed to load folders:", error);
      setStatus("❌ Failed to load folders: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle tree node expansion
  const toggleNode = (path) => {
    const updateNode = (node) => {
      if (node.path === path) {
        return { ...node, expanded: !node.expanded };
      }
      if (node.children) {
        return { ...node, children: node.children.map(updateNode) };
      }
      return node;
    };
    
    setFolderTree(prev => updateNode(prev));
  };

  // ➕ Create folder with nested support
  const createFolder = async () => {
    if (!newFolderName.trim()) {
      alert("Please enter a folder name.");
      return;
    }
    
    // Support nested folder creation with forward slashes
    const folderPath = newFolderName.trim();

    setIsLoading(true);
    setStatus(`🔄 Creating folder: ${folderPath}...`);
    
    try {
      const placeholderBlob = containerClient.getBlockBlobClient(`${folderPath}/.placeholder`);
      await placeholderBlob.upload("", 0); // zero-byte placeholder
      setStatus(`✅ Created folder: ${folderPath}`);
      setNewFolderName("");
      await loadFolders(); // Refresh folder list
    } catch (error) {
      console.error("Failed to create folder:", error);
      setStatus("❌ Failed to create folder: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ⬆️ Upload files
  const uploadFiles = async () => {
    if (!selectedFolder) {
      alert("Please select a folder.");
      return;
    }
    
    if (!files.length) {
      alert("No files selected.");
      return;
    }

    setIsLoading(true);
    setStatus(`🔄 Uploading ${files.length} file(s) to ${selectedFolder}...`);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const blobPath = `${selectedFolder}/${file.name}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
        
        setStatus(`🔄 Uploading ${i + 1}/${files.length}: ${file.name}`);
        await blockBlobClient.uploadBrowserData(file);
        console.log("✅ Uploaded:", blobPath);
      }
      
      setStatus(`✅ Successfully uploaded ${files.length} file(s) to ${selectedFolder}!`);
      setFiles([]);
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      
    } catch (err) {
      console.error("❌ Upload failed:", err.message);
      setStatus("❌ Upload failed: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  const getStatusStyles = () => {
    if (status.includes('❌')) {
      return {
        padding: '1rem',
        borderRadius: '8px',
        border: `2px solid ${isDark ? '#dc2626' : '#f44336'}`,
        fontWeight: '600',
        backgroundColor: isDark ? 'rgba(220, 38, 38, 0.1)' : '#ffebee',
        color: isDark ? '#fca5a5' : '#d32f2f'
      };
    } else if (status.includes('🔄')) {
      return {
        padding: '1rem',
        borderRadius: '8px',
        border: `2px solid ${isDark ? '#2563eb' : '#2196f3'}`,
        fontWeight: '600',
        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.1)' : '#e3f2fd',
        color: isDark ? '#93c5fd' : '#1976d2'
      };
    } else {
      return {
        padding: '1rem',
        borderRadius: '8px',
        border: `2px solid ${isDark ? '#16a34a' : '#4CAF50'}`,
        fontWeight: '600',
        backgroundColor: isDark ? 'rgba(22, 163, 74, 0.1)' : '#e8f5e8',
        color: isDark ? '#86efac' : '#2e7d32'
      };
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      padding: '1rem'
    }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .folder-node:hover {
          background-color: ${isDark ? '#374151' : '#f5f5f5'} !important;
        }
        
        @media (max-width: 768px) {
          .container {
            padding: 1rem !important;
            margin: 0 !important;
          }
          
          .flex-container {
            flex-direction: column !important;
            gap: 0.75rem !important;
          }
          
          .flex-container > * {
            width: 100% !important;
          }
        }
      `}</style>

      {/* Theme Toggle */}
      <div style={{ textAlign: 'center', padding: '1rem' }}>
        <button
          onClick={() => setIsDark(!isDark)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: isDark ? '#374151' : '#f3f4f6',
            color: isDark ? '#e5e7eb' : '#374151',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>

      <div className="container" style={{
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: '1200px',
        margin: '0 auto',
        backgroundColor: isDark ? '#111827' : '#ffffff',
        borderRadius: '12px',
        boxShadow: isDark 
          ? '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)' 
          : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: `1px solid ${isDark ? 'rgba(75, 85, 99, 0.5)' : '#e2e8f0'}`
      }}>
        <h2 style={{
          textAlign: 'center',
          color: isDark ? '#ffffff' : '#0f172a',
          fontSize: '2rem',
          fontFamily: 'Georgia, serif',
          fontWeight: 'bold',
          marginBottom: '2rem'
        }}>
          📂 File Uploader
        </h2>
        
        <div style={{
          marginBottom: '1.5rem',
          padding: '0.75rem',
          backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#e8f5e8',
          borderRadius: '8px',
          border: `1px solid ${isDark ? '#059669' : '#4CAF50'}`,
          textAlign: 'center',
          color: isDark ? '#86efac' : '#2e7d32',
          fontSize: '14px'
        }}>
          🔗 Connected to: <strong>{storageAccountName}</strong> → <strong>{containerName}</strong>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div style={{
            textAlign: 'center',
            margin: '1rem 0',
            padding: '1rem',
            backgroundColor: isDark ? 'rgba(37, 99, 235, 0.1)' : '#e3f2fd',
            borderRadius: '8px',
            border: `1px solid ${isDark ? '#2563eb' : '#2196f3'}`,
            color: isDark ? '#93c5fd' : '#1976d2'
          }}>
            <div style={{
              display: 'inline-block',
              width: '20px',
              height: '20px',
              border: `3px solid ${isDark ? '#374151' : '#f3f3f3'}`,
              borderTop: `3px solid ${isDark ? '#3b82f6' : '#2196f3'}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginRight: '10px'
            }}></div>
            Processing...
          </div>
        )}

        {/* Select Existing Folders - Tree Structure */}
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: isDark ? '#1f2937' : '#f8fafc',
          borderRadius: '8px',
          border: `1px solid ${isDark ? '#374151' : '#e2e8f0'}`,
          boxShadow: isDark 
            ? '0 1px 3px rgba(0, 0, 0, 0.3)' 
            : '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <label style={{
            display: 'block',
            fontWeight: '600',
            color: isDark ? '#e5e7eb' : '#374151',
            marginBottom: '0.75rem',
            fontSize: '16px'
          }}>
            1. 📁 Select Existing Folder:
          </label>
          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            overflowX: 'hidden',
            border: `1px solid ${isDark ? '#4b5563' : '#d1d5db'}`,
            borderRadius: '8px',
            padding: '0.5rem',
            backgroundColor: isDark ? '#374151' : '#ffffff'
          }}>
            {folderTree && (
              <FolderTreeNode 
                node={folderTree}
                onToggle={toggleNode}
                selectedFolder={selectedFolder}
                onSelectFolder={setSelectedFolder}
                isDark={isDark}
              />
            )}
          </div>
          {selectedFolder && (
            <p style={{
              marginTop: '0.75rem',
              color: isDark ? '#60a5fa' : '#2563eb',
              fontWeight: '600',
              fontSize: '14px',
              wordBreak: 'break-all'
            }}>
              ✅ Selected: {selectedFolder}
            </p>
          )}
        </div>

        {/* Create New Folder */}
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: isDark ? '#1f2937' : '#f8fafc',
          borderRadius: '8px',
          border: `1px solid ${isDark ? '#374151' : '#e2e8f0'}`,
          boxShadow: isDark 
            ? '0 1px 3px rgba(0, 0, 0, 0.3)' 
            : '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <label style={{
            display: 'block',
            fontWeight: '600',
            color: isDark ? '#e5e7eb' : '#374151',
            marginBottom: '0.75rem',
            fontSize: '16px'
          }}>
            2. ➕ Create New Folder (supports nesting with /):
          </label>
          <div style={{
            marginBottom: '0.75rem',
            fontSize: '14px',
            color: isDark ? '#9ca3af' : '#6b7280'
          }}>
            Examples: <code style={{
              backgroundColor: isDark ? '#4b5563' : '#f1f5f9',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '13px'
            }}>documents</code>, <code style={{
              backgroundColor: isDark ? '#4b5563' : '#f1f5f9',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '13px'
            }}>projects/2024</code>, <code style={{
              backgroundColor: isDark ? '#4b5563' : '#f1f5f9',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '13px'
            }}>client-files/acme-corp/invoices</code>
          </div>
          <div className="flex-container" style={{ 
            display: 'flex', 
            gap: '0.75rem',
            alignItems: 'stretch'
          }}>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. project-alpha, documents/2024, client/acme/files"
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '0.75rem',
                fontSize: '14px',
                border: `2px solid ${isDark ? '#374151' : '#d1d5db'}`,
                borderRadius: '6px',
                backgroundColor: isDark ? '#374151' : '#ffffff',
                color: isDark ? '#e5e7eb' : '#374151',
                transition: 'border-color 0.2s ease',
                opacity: isLoading ? 0.6 : 1,
                minWidth: 0
              }}
            />
            <button 
              onClick={createFolder} 
              disabled={isLoading || !newFolderName.trim()}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '6px',
                cursor: isLoading || !newFolderName.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: isLoading || !newFolderName.trim() ? '#9ca3af' : '#22c55e',
                color: 'white',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (!isLoading && newFolderName.trim()) {
                  e.target.style.backgroundColor = '#16a34a';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading && newFolderName.trim()) {
                  e.target.style.backgroundColor = '#22c55e';
                }
              }}
            >
              {isLoading ? "Creating..." : "Create"}
            </button>
          </div>
        </div>

        {/* Upload Files */}
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: isDark ? '#1f2937' : '#f8fafc',
          borderRadius: '8px',
          border: `1px solid ${isDark ? '#374151' : '#e2e8f0'}`,
          boxShadow: isDark 
            ? '0 1px 3px rgba(0, 0, 0, 0.3)' 
            : '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <label style={{
            display: 'block',
            fontWeight: '600',
            color: isDark ? '#e5e7eb' : '#374151',
            marginBottom: '0.75rem',
            fontSize: '16px'
          }}>
            3. ⬆️ Upload Files to: <span style={{
              color: selectedFolder ? (isDark ? '#60a5fa' : '#2563eb') : (isDark ? '#6b7280' : '#9ca3af'),
              wordBreak: 'break-all'
            }}>
              {selectedFolder || "(no folder selected)"}
            </span>
          </label>
          
          <div style={{
            marginBottom: '1rem',
            padding: '1rem',
            border: `2px dashed ${isDark ? '#4b5563' : '#d1d5db'}`,
            borderRadius: '8px',
            backgroundColor: isDark ? '#374151' : '#f9fafb',
            textAlign: 'center',
            transition: 'all 0.2s ease'
          }}>
            <input 
              type="file" 
              multiple 
              onChange={(e) => setFiles([...e.target.files])}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '14px',
                backgroundColor: 'transparent',
                border: 'none',
                color: isDark ? '#e5e7eb' : '#374151',
                opacity: isLoading ? 0.6 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            />
            <div style={{
              marginTop: '0.5rem',
              fontSize: '12px',
              color: isDark ? '#9ca3af' : '#6b7280'
            }}>
              Click to select files or drag and drop
            </div>
          </div>
          
          {files.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{
                fontWeight: '600',
                color: isDark ? '#e5e7eb' : '#374151',
                marginBottom: '0.5rem',
                fontSize: '14px'
              }}>
                Selected Files ({files.length}):
              </p>
              <div style={{
                maxHeight: '120px',
                overflowY: 'auto',
                padding: '0.5rem',
                backgroundColor: isDark ? '#374151' : '#f1f5f9',
                borderRadius: '6px',
                border: `1px solid ${isDark ? '#4b5563' : '#e2e8f0'}`
              }}>
                <ul style={{
                  margin: '0',
                  paddingLeft: '1.25rem',
                  color: isDark ? '#d1d5db' : '#4b5563'
                }}>
                  {Array.from(files).slice(0, 10).map((file, idx) => (
                    <li key={idx} style={{ 
                      marginBottom: '0.25rem', 
                      fontSize: '13px',
                      wordBreak: 'break-all'
                    }}>
                      📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </li>
                  ))}
                  {files.length > 10 && (
                    <li style={{
                      color: isDark ? '#6b7280' : '#9ca3af',
                      fontStyle: 'italic',
                      fontSize: '13px'
                    }}>
                      ... and {files.length - 10} more files
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          <button 
            onClick={uploadFiles} 
            disabled={isLoading || !selectedFolder || !files.length}
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '16px',
              fontWeight: '600',
              border: 'none',
              borderRadius: '6px',
              cursor: (isLoading || !selectedFolder || !files.length) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: (isLoading || !selectedFolder || !files.length) ? '#9ca3af' : '#3b82f6',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              if (!isLoading && selectedFolder && files.length) {
                e.target.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading && selectedFolder && files.length) {
                e.target.style.backgroundColor = '#3b82f6';
              }
            }}
          >
            {isLoading ? "Uploading..." : `Upload ${files.length} File(s)`}
          </button>
        </div>

        {/* Status Messages */}
        {status && <div style={getStatusStyles()}>{status}</div>}
      </div>
    </div>
  );
}

export default App;