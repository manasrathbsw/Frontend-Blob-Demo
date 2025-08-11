


import { useEffect, useState, useRef } from "react";
import { BlobServiceClient } from "@azure/storage-blob";
import JSZip from "jszip";
import { saveAs } from "file-saver";

// 🔐 Your Azure Storage configuration
const sasToken = "sv=2024-11-04&ss=bfqt&srt=co&sp=rwdlacupiytfx&se=2025-12-31T14:17:31Z&st=2025-08-11T06:02:31Z&spr=https&sig=mC6i%2FAEY4gtqQsb48A12r0mfjsupa6WyJaOtAsBIv9c%3D";
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

// File/Folder Item Component
const FileItem = ({ item, isSelected, onSelect, onDoubleClick, onRightClick, onDragStart }) => {
  const isFolder = item.type === 'folder';
  
  const getFileIcon = (fileName) => {
    if (isFolder) return '📁';
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconMap = {
      pdf: '📄', doc: '📝', docx: '📝', txt: '📝',
      jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️',
      mp4: '🎬', avi: '🎬', mov: '🎬',
      mp3: '🎵', wav: '🎵', m4a: '🎵',
      zip: '📦', rar: '📦', '7z': '📦',
      xlsx: '📊', xls: '📊', csv: '📊'
    };
    return iconMap[ext] || '📄';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div
      draggable={!isFolder}
      onDragStart={(e) => onDragStart && onDragStart(e, item)}
      onClick={() => onSelect(item)}
      onDoubleClick={() => onDoubleClick(item)}
      onContextMenu={(e) => onRightClick && onRightClick(e, item)}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
        borderRadius: '4px',
        cursor: 'pointer',
        userSelect: 'none',
        border: isSelected ? '1px solid #2196f3' : '1px solid transparent'
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.target.style.backgroundColor = '#f5f5f5';
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.target.style.backgroundColor = 'transparent';
      }}
    >
      <div style={{ marginRight: '12px', fontSize: '20px' }}>
        {getFileIcon(item.name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '500', fontSize: '14px', wordBreak: 'break-all' }}>
          {item.name}
        </div>
        {!isFolder && (
          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
            {formatFileSize(item.size)} • {formatDate(item.lastModified)}
          </div>
        )}
      </div>
    </div>
  );
};

// Breadcrumb Navigation
const Breadcrumb = ({ currentPath, onNavigate }) => {
  const pathParts = currentPath ? currentPath.split('/') : [];
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '8px 16px',
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #dee2e6',
      fontSize: '14px'
    }}>
      <span
        onClick={() => onNavigate('')}
        style={{
          cursor: 'pointer',
          color: '#007bff',
          textDecoration: 'none'
        }}
        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
      >
        🏠 Root
      </span>
      {pathParts.map((part, index) => {
        const partialPath = pathParts.slice(0, index + 1).join('/');
        return (
          <span key={index}>
            <span style={{ margin: '0 8px', color: '#6c757d' }}>›</span>
            <span
              onClick={() => onNavigate(partialPath)}
              style={{
                cursor: 'pointer',
                color: '#007bff',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
            >
              📁 {part}
            </span>
          </span>
        );
      })}
    </div>
  );
};

const supportedPreview = (name) =>
  name.match(/\.(jpg|jpeg|png|gif|txt|md|pdf)$/i);

// Context Menu
const ContextMenu = ({ x, y, item, onClose, onDelete, onRename, onDownload, onPreview }) => {
  const menuRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: y,
        left: x,
        backgroundColor: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000,
        minWidth: '150px'
      }}
    >
      <div
        onClick={() => { onDownload(item); onClose(); }}
        style={{
          padding: '8px 16px',
          cursor: 'pointer',
          borderBottom: '1px solid #eee'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
      >
        📥 Download
      </div>
      <div
        onClick={() => { onRename(item); onClose(); }}
        style={{
          padding: '8px 16px',
          cursor: 'pointer',
          borderBottom: '1px solid #eee'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
      >
        ✏️ Rename
      </div>
      <div
        onClick={() => { onDelete(item); onClose(); }}
        style={{
          padding: '8px 16px',
          cursor: 'pointer',
          color: '#dc3545'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
      >
        🗑️ Delete
      </div>
      {/* Preview option only for supported types */}
      {item.type === 'file' && supportedPreview(item.name) && (
        <div
          onClick={() => { onPreview(item); onClose(); }}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            borderBottom: '1px solid #eee'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
        >
          👁️ Preview
        </div>
      )}
    </div>
  );
};

function App() {
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewText, setPreviewText] = useState('');
  const fileInputRef = useRef();

  // Show configuration message if not fully configured
  if (!isConfigured) {
    return (
      <div style={{ 
        padding: "2rem", 
        fontFamily: "sans-serif", 
        maxWidth: "600px", 
        margin: "auto",
        backgroundColor: "#fff3e0",
        borderRadius: "10px",
        border: "2px solid #ff9800"
      }}>
        <h2>⚙️ Configuration Required</h2>
        <p>Please update your Azure Storage configuration in the code:</p>
        <ul>
          <li>Replace <code>sasToken</code> with your full SAS token</li>
          <li>Update <code>containerName</code> with your container name</li>
          <li>Verify <code>storageAccountName</code> is correct</li>
        </ul>
      </div>
    );
  }

  // FIXED: Load items in current path with proper folder enumeration
  const loadItems = async (path = currentPath) => {
    setIsLoading(true);
    setStatus('🔄 Loading files...');
    
    try {
      const pathMap = new Map();
      const seenFolders = new Set();

      for await (const blob of containerClient.listBlobsFlat()) {
        if (blob.name.endsWith('/.placeholder')) continue;

        let relativePath;
        let shouldInclude = false;

        if (!path) {
          // Root directory - show everything at root level
          relativePath = blob.name;
          shouldInclude = true;
        } else {
          // In a subdirectory - only show items within this path
          if (blob.name.startsWith(path + '/')) {
            relativePath = blob.name.substring(path.length + 1);
            shouldInclude = true;
          }
        }

        if (!shouldInclude || !relativePath) continue;

        const pathParts = relativePath.split('/');

        if (pathParts.length === 1) {
          // Direct file in current directory
          pathMap.set(blob.name, {
            name: pathParts[0],
            type: 'file',
            path: blob.name,
            size: blob.properties.contentLength || 0,
            lastModified: blob.properties.lastModified
          });
        } else if (pathParts.length > 1) {
          // File in subdirectory - create folder entry for every unique first-level folder
          const folderName = pathParts[0];
          const folderPath = path ? `${path}/${folderName}` : folderName;

          // Only add folder once (avoid duplicates)
          if (!seenFolders.has(folderPath)) {
            seenFolders.add(folderPath);
            pathMap.set(folderPath, {
              name: folderName,
              type: 'folder',
              path: folderPath,
              size: 0,
              lastModified: null
            });
          }
        }
      }

      // FIX: Also enumerate folders by looking for blobs that are placeholders
      for await (const blob of containerClient.listBlobsFlat()) {
        if (blob.name.endsWith('/.placeholder')) {
          let relativePath;
          if (!path) {
            relativePath = blob.name;
          } else if (blob.name.startsWith(path + '/')) {
            relativePath = blob.name.substring(path.length + 1);
          }
          if (relativePath) {
            const pathParts = relativePath.split('/');
            if (pathParts.length === 2 && pathParts[1] === '.placeholder') {
              const folderName = pathParts[0];
              const folderPath = path ? `${path}/${folderName}` : folderName;
              if (!seenFolders.has(folderPath)) {
                seenFolders.add(folderPath);
                pathMap.set(folderPath, {
                  name: folderName,
                  type: 'folder',
                  path: folderPath,
                  size: 0,
                  lastModified: null
                });
              }
            }
          }
        }
      }

      const itemsArray = Array.from(pathMap.values());

      // Sort: folders first, then files, both alphabetically
      itemsArray.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      setItems(itemsArray);
      setStatus('');
      
      // Debug logging
      console.log('Current path:', path);
      console.log('Found items:', itemsArray.length);
      console.log('Items:', itemsArray);
      
    } catch (error) {
      console.error('Failed to load items:', error);
      setStatus('❌ Failed to load files: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to path
  const navigateToPath = (path) => {
    setCurrentPath(path);
    setSelectedItems(new Set());
    loadItems(path);
  };

  // Handle item selection
  const handleItemSelect = (item) => {
    const newSelected = new Set();
    newSelected.add(item.path);
    setSelectedItems(newSelected);
  };

  // Handle item double click
  const handleItemDoubleClick = (item) => {
    if (item.type === 'folder') {
      navigateToPath(item.path);
    } else {
      // Download file on double click
      downloadItem(item);
    }
  };

  // Handle right click
  const handleRightClick = (e, item) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item: item
    });
  };

  // Download item
  const downloadItem = async (item) => {
    if (item.type === 'folder') {
      setIsLoading(true);
      setStatus(`🔄 Zipping folder "${item.name}"...`);
      try {
        const zip = new JSZip();
        let fileCount = 0;
        // Add all files in the folder to the zip
        for await (const blob of containerClient.listBlobsFlat()) {
          if (blob.name.startsWith(item.path + '/') && !blob.name.endsWith('/.placeholder')) {
            const blobClient = containerClient.getBlobClient(blob.name);
            const downloadResponse = await blobClient.download();
            const fileBlob = await downloadResponse.blobBody;
            const fileName = blob.name.substring(item.path.length + 1);
            zip.file(fileName, fileBlob);
            fileCount++;
          }
        }
        if (fileCount === 0) {
          setStatus(`❌ Folder "${item.name}" is empty.`);
          setIsLoading(false);
          return;
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        saveAs(zipBlob, `${item.name}.zip`);
        setStatus(`✅ Downloaded folder "${item.name}" as zip`);
        setTimeout(() => setStatus(''), 3000);
      } catch (error) {
        console.error('Folder download failed:', error);
        setStatus(`❌ Folder download failed: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setStatus(`🔄 Downloading ${item.name}...`);

    try {
      const blobClient = containerClient.getBlobClient(item.path);
      const downloadResponse = await blobClient.download();
      const blob = await downloadResponse.blobBody;
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setStatus(`✅ Downloaded ${item.name}`);
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Download failed:', error);
      setStatus(`❌ Download failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete item
  const deleteItem = async (item) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    setIsLoading(true);
    setStatus(`🔄 Deleting ${item.name}...`);

    try {
      if (item.type === 'folder') {
        // Delete all files in folder
        for await (const blob of containerClient.listBlobsFlat()) {
          if (blob.name.startsWith(item.path + '/')) {
            await containerClient.deleteBlob(blob.name);
          }
        }
      } else {
        await containerClient.deleteBlob(item.path);
      }
      
      setStatus(`✅ Deleted ${item.name}`);
      setTimeout(() => setStatus(''), 3000);
      loadItems();
    } catch (error) {
      console.error('Delete failed:', error);
      setStatus(`❌ Delete failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Rename item
  const renameItem = async (item) => {
    const newName = prompt(`Rename "${item.name}" to:`, item.name);
    if (!newName || newName === item.name) return;

    setIsLoading(true);
    setStatus(`🔄 Renaming ${item.name}...`);

    try {
      const oldPath = item.path;
      const pathParts = oldPath.split('/');
      pathParts[pathParts.length - 1] = newName;
      const newPath = pathParts.join('/');

      if (item.type === 'folder') {
        // Rename folder by moving all its contents
        for await (const blob of containerClient.listBlobsFlat()) {
          if (blob.name.startsWith(oldPath + '/')) {
            const newBlobPath = blob.name.replace(oldPath + '/', newPath + '/');
            const sourceBlob = containerClient.getBlobClient(blob.name);
            const targetBlob = containerClient.getBlobClient(newBlobPath);
            
            await targetBlob.beginCopyFromURL(sourceBlob.url);
            await sourceBlob.delete();
          }
        }
      } else {
        // Rename file
        const sourceBlob = containerClient.getBlobClient(oldPath);
        const targetBlob = containerClient.getBlobClient(newPath);
        
        await targetBlob.beginCopyFromURL(sourceBlob.url);
        await sourceBlob.delete();
      }
      
      setStatus(`✅ Renamed to ${newName}`);
      setTimeout(() => setStatus(''), 3000);
      loadItems();
    } catch (error) {
      console.error('Rename failed:', error);
      setStatus(`❌ Rename failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Create new folder
  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    const folderPath = currentPath ? `${currentPath}/${newFolderName}` : newFolderName;
    
    setIsLoading(true);
    setStatus(`🔄 Creating folder ${newFolderName}...`);

    try {
      const placeholderBlob = containerClient.getBlockBlobClient(`${folderPath}/.placeholder`);
      await placeholderBlob.upload('', 0);
      
      setStatus(`✅ Created folder ${newFolderName}`);
      setTimeout(() => setStatus(''), 3000);
      setNewFolderName('');
      setShowNewFolderInput(false);
      loadItems();
    } catch (error) {
      console.error('Create folder failed:', error);
      setStatus(`❌ Create folder failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // FIXED: Handle file upload with proper path context
  const handleFileUpload = async (files) => {
    setIsLoading(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // FIXED: Properly construct the blob path using current path
        const blobPath = currentPath ? `${currentPath}/${file.name}` : file.name;
        
        setStatus(`🔄 Uploading ${i + 1}/${files.length}: ${file.name} to ${currentPath || 'root'}`);
        
        const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
        await blockBlobClient.uploadBrowserData(file);
      }
      
      setStatus(`✅ Uploaded ${files.length} file(s) to ${currentPath || 'root'}`);
      setTimeout(() => setStatus(''), 3000);
      loadItems(); // Reload current directory
    } catch (error) {
      console.error('Upload failed:', error);
      setStatus(`❌ Upload failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  // Preview file
  const handlePreview = async (item) => {
    if (item.type !== 'file') return;
    setIsLoading(true);
    setStatus(`🔄 Loading preview for ${item.name}...`);
    try {
        const blobClient = containerClient.getBlobClient(item.path);
        const downloadResponse = await blobClient.download();
        const blob = await downloadResponse.blobBody;
        const ext = item.name.split('.').pop().toLowerCase();
        
        if (ext === 'txt' || ext === 'md') {
            const text = await blob.text();
            setPreviewText(text);
            setPreviewUrl('');
        } else if (ext === 'pdf') {
            // Create a blob URL with the correct content type for PDFs
            const pdfBlob = new Blob([await blob.arrayBuffer()], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(pdfBlob);
            setPreviewUrl(url);
            setPreviewText('');
        } else {
            const url = window.URL.createObjectURL(blob);
            setPreviewUrl(url);
            setPreviewText('');
        }
        setPreviewFile(item);
        setStatus('');
    } catch (error) {
        setStatus(`❌ Preview failed: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  return (
    <div style={{ 
      fontFamily: "sans-serif", 
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#fff"
    }}>
      {/* Header */}
      <div style={{
        padding: "1rem",
        backgroundColor: "#f8f9fa",
        borderBottom: "1px solid #dee2e6",
        textAlign: "center"
      }}>
        <h2 style={{ margin: 0, color: "#333" }}>
          📂 File Explorer
        </h2>
        <div style={{ fontSize: "14px", color: "#666", marginTop: "0.5rem" }}>
          🔗 Connected to Klarifai Hub
          {currentPath && (
            <span style={{ color: "#007bff" }}> → {currentPath}</span>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        padding: "8px 16px",
        backgroundColor: "#fff",
        borderBottom: "1px solid #dee2e6",
        gap: "12px"
      }}>
        <button
          onClick={() => navigateToPath('')}
          disabled={!currentPath}
          style={{
            padding: "6px 12px",
            backgroundColor: currentPath ? "#007bff" : "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: currentPath ? "pointer" : "not-allowed",
            fontSize: "14px"
          }}
        >
          🏠 Home
        </button>
        
        <button
          onClick={() => setShowNewFolderInput(true)}
          disabled={isLoading}
          style={{
            padding: "6px 12px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isLoading ? "not-allowed" : "pointer",
            fontSize: "14px"
          }}
        >
          📁 New Folder
        </button>
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          style={{
            padding: "6px 12px",
            backgroundColor: "#17a2b8",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isLoading ? "not-allowed" : "pointer",
            fontSize: "14px"
          }}
        >
          📤 Upload Files
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => handleFileUpload(Array.from(e.target.files))}
        />

        {showNewFolderInput && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              style={{
                padding: "6px 8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "14px"
              }}
              onKeyPress={(e) => e.key === 'Enter' && createFolder()}
              autoFocus
            />
            <button
              onClick={createFolder}
              style={{
                padding: "6px 12px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              ✓
            </button>
            <button
              onClick={() => {
                setShowNewFolderInput(false);
                setNewFolderName('');
              }}
              style={{
                padding: "6px 12px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      <Breadcrumb currentPath={currentPath} onNavigate={navigateToPath} />

      {/* Status Bar */}
      {status && (
        <div style={{
          padding: "8px 16px",
          backgroundColor: status.includes('❌') ? "#f8d7da" : 
                          status.includes('🔄') ? "#d1ecf1" : "#d4edda",
          color: status.includes('❌') ? "#721c24" : 
                 status.includes('🔄') ? "#0c5460" : "#155724",
          fontSize: "14px",
          fontWeight: "500"
        }}>
          {status}
        </div>
      )}

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          padding: "16px",
          backgroundColor: dragOver ? "#e3f2fd" : "#fff",
          border: dragOver ? "2px dashed #2196f3" : "none",
          position: "relative"
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {dragOver && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(33, 150, 243, 0.1)",
            fontSize: "24px",
            fontWeight: "bold",
            color: "#2196f3",
            pointerEvents: "none"
          }}>
            📤 Drop files here to upload to {currentPath || 'root'}
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{
              display: "inline-block",
              width: "32px",
              height: "32px",
              border: "3px solid #f3f3f3",
              borderTop: "3px solid #007bff",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }}></div>
            <p style={{ marginTop: "1rem", color: "#666" }}>Loading...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : items.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "4rem 2rem",
            color: "#666"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "1rem" }}>📂</div>
            <h3>This folder is empty</h3>
            <p>Drop files here or use the upload button to add files</p>
            <p style={{ fontSize: "12px", color: "#999" }}>
              Current path: {currentPath || 'root'}
            </p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "8px"
          }}>
            {items.map(item => (
              <FileItem
                key={item.path}
                item={item}
                isSelected={selectedItems.has(item.path)}
                onSelect={handleItemSelect}
                onDoubleClick={handleItemDoubleClick}
                onRightClick={handleRightClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          onClose={() => setContextMenu(null)}
          onDownload={downloadItem}
          onDelete={deleteItem}
          onRename={renameItem}
          onPreview={handlePreview}
        />
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            background: '#fff',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            <button
              onClick={() => {
                setPreviewFile(null);
                if (previewUrl) window.URL.revokeObjectURL(previewUrl);
                setPreviewUrl('');
                setPreviewText('');
              }}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                cursor: 'pointer',
                zIndex: 2001
              }}
            >✕</button>
            <h3 style={{ marginBottom: '16px' }}>Preview: {previewFile.name}</h3>
            {previewFile.name.match(/\.(jpg|jpeg|png|gif)$/i) ? (
              <img src={previewUrl} alt={previewFile.name} style={{ maxWidth: '100%', maxHeight: '70vh' }} />
            ) : previewFile.name.match(/\.(pdf)$/i) ? (
              <iframe 
                  src={`${previewUrl}#toolbar=0&navpanes=0`}
                  title={previewFile.name} 
                  style={{ 
                      width: '100%', 
                      height: '75vh', 
                      border: 'none',
                      borderRadius: '4px'
                  }}
              />
            ) : previewFile.name.match(/\.(txt|md)$/i) ? (
              <pre style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: '70vh',
                  background: '#f8f9fa',
                  padding: '16px',
                  borderRadius: '4px',
                  fontSize: '15px'
              }}>{previewText}</pre>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
