import { useEffect, useState } from "react";
import { BlobServiceClient } from "@azure/storage-blob";

// 🔐 Your Azure Storage configuration
const sasToken = "sv=2024-11-04&ss=bfqt&srt=co&sp=rwdlacupiytfx&se=2025-07-30T20:09:41Z&st=2025-07-25T11:54:41Z&spr=https,http&sig=7eTc7HU5bg8voVA%2FO7sht1iqjO%2F56OBg%2FrV6x4bjY8Q%3D";
const containerName = "frontend-blob"; // Replace with your actual container name
const storageAccountName = "klarifainewblob";

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

function App() {
  const [folderList, setFolderList] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
        <h2>⚙️ Configuration Status</h2>
        <div style={{ marginBottom: "1rem" }}>
          <h3>✅ Completed:</h3>
          <ul>
            <li>✅ Storage Account Name: <code>demoblobstorage2</code></li>
            <li>✅ SAS Token: {sasToken.includes('xxxxx') ? '❌ Please replace xxxxx with full token' : '✅ Configured'}</li>
          </ul>
        </div>
        
        <div style={{ marginBottom: "1rem" }}>
          <h3>❌ Still Needed:</h3>
          <ul>
            <li>❌ Container Name: Replace <code>YOUR_CONTAINER_NAME</code> with your actual container name</li>
          </ul>
        </div>

        <div style={{ 
          padding: "1rem", 
          backgroundColor: "#e3f2fd", 
          borderRadius: "8px",
          marginTop: "1rem"
        }}>
          <h4>🔍 How to find your Container Name:</h4>
          <ol>
            <li>Go to your Azure Storage Account: <strong>demoblobstorage2</strong></li>
            <li>Click on "Containers" in the left menu</li>
            <li>You'll see a list of containers (e.g., "uploads", "files", "documents")</li>
            <li>Copy the name of the container you want to use</li>
            <li>Replace <code>YOUR_CONTAINER_NAME</code> in the code with that name</li>
          </ol>
        </div>

        <div style={{ 
          padding: "1rem", 
          backgroundColor: "#ffebee", 
          borderRadius: "8px",
          marginTop: "1rem"
        }}>
          <h4>🔒 Complete your SAS Token:</h4>
          <p>Replace the <code>xxxxxxxxxxxxxxxxxxxxx</code> part in your SAS token with the complete token from Azure.</p>
          <p><strong>Current:</strong> <code>sv=2024-11-04&ss=b&srt=co&xxxxxxxxxxxxxxxxxxxxx</code></p>
          <p><strong>Should be:</strong> <code>sv=2024-11-04&ss=b&srt=co&sp=racwdl&se=2024-12-01...</code> (your full token)</p>
        </div>
      </div>
    );
  }

  // 🔄 Load folders
  const loadFolders = async () => {
    setIsLoading(true);
    setStatus("🔄 Loading folders from Azure...");
    
    try {
      const prefixSet = new Set();
      for await (const blob of containerClient.listBlobsFlat()) {
        const prefix = blob.name.split("/")[0];
        if (prefix) prefixSet.add(prefix);
      }
      setFolderList(Array.from(prefixSet));
      setStatus("✅ Folders loaded successfully!");
      setTimeout(() => setStatus(""), 3000);
    } catch (error) {
      console.error("Failed to load folders:", error);
      setStatus("❌ Failed to load folders: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ➕ Create folder
  const createFolder = async () => {
    if (!newFolderName.trim()) {
      alert("Please enter a folder name.");
      return;
    }
    
    if (folderList.includes(newFolderName)) {
      alert("Folder already exists!");
      return;
    }

    setIsLoading(true);
    setStatus(`🔄 Creating folder: ${newFolderName}...`);
    
    try {
      const placeholderBlob = containerClient.getBlockBlobClient(`${newFolderName}/.placeholder`);
      await placeholderBlob.upload("", 0); // zero-byte placeholder
      setStatus(`✅ Created folder: ${newFolderName}`);
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

  return (
    <div style={{ 
      padding: "2rem", 
      fontFamily: "sans-serif", 
      maxWidth: "700px", 
      margin: "auto",
      backgroundColor: "#f9f9f9",
      borderRadius: "10px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
    }}>
      <h2 style={{ textAlign: "center", color: "#333", marginBottom: "2rem" }}>
        📂 Azure Folder Uploader
      </h2>
      
      <div style={{ 
        marginBottom: "1rem", 
        padding: "0.75rem", 
        backgroundColor: "#e8f5e8", 
        borderRadius: "6px",
        border: "1px solid #4CAF50",
        textAlign: "center",
        color: "#2e7d32",
        fontSize: "14px"
      }}>
        🔗 Connected to: <strong>{storageAccountName}</strong> → <strong>{containerName}</strong>
      </div>
      
      {/* Loading Spinner */}
      {isLoading && (
        <div style={{ 
          textAlign: "center", 
          margin: "1rem 0",
          padding: "1rem",
          backgroundColor: "#e3f2fd",
          borderRadius: "8px",
          border: "1px solid #2196f3"
        }}>
          <div style={{
            display: "inline-block",
            width: "20px",
            height: "20px",
            border: "3px solid #f3f3f3",
            borderTop: "3px solid #2196f3",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            marginRight: "10px"
          }}></div>
          Processing...
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Select Existing Folders */}
      <div style={{ 
        marginBottom: "1.5rem", 
        padding: "1rem", 
        backgroundColor: "white", 
        borderRadius: "8px",
        border: "1px solid #ddd"
      }}>
        <label style={{ fontWeight: "bold", color: "#555", display: "block", marginBottom: "0.5rem" }}>
          1. 📁 Select Existing Folder:
        </label>
        <select 
          value={selectedFolder} 
          onChange={(e) => setSelectedFolder(e.target.value)}
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "0.75rem",
            fontSize: "16px",
            border: "2px solid #ddd",
            borderRadius: "6px",
            backgroundColor: isLoading ? "#f5f5f5" : "white"
          }}
        >
          <option value="">-- Choose a folder --</option>
          {folderList.map((folder, idx) => (
            <option key={idx} value={folder}>
              📁 {folder}
            </option>
          ))}
        </select>
        {selectedFolder && (
          <p style={{ marginTop: "0.5rem", color: "#2196f3", fontWeight: "bold" }}>
            ✅ Selected: {selectedFolder}
          </p>
        )}
      </div>

      {/* Create New Folder */}
      <div style={{ 
        marginBottom: "1.5rem", 
        padding: "1rem", 
        backgroundColor: "white", 
        borderRadius: "8px",
        border: "1px solid #ddd"
      }}>
        <label style={{ fontWeight: "bold", color: "#555", display: "block", marginBottom: "0.5rem" }}>
          2. ➕ Create New Folder:
        </label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="e.g. project-alpha, documents-2024"
            disabled={isLoading}
            style={{
              flex: 1,
              padding: "0.75rem",
              fontSize: "16px",
              border: "2px solid #ddd",
              borderRadius: "6px",
              backgroundColor: isLoading ? "#f5f5f5" : "white"
            }}
          />
          <button 
            onClick={createFolder} 
            disabled={isLoading || !newFolderName.trim()}
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "16px",
              backgroundColor: isLoading || !newFolderName.trim() ? "#ccc" : "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: isLoading || !newFolderName.trim() ? "not-allowed" : "pointer",
              fontWeight: "bold"
            }}
          >
            {isLoading ? "Creating..." : "Create"}
          </button>
        </div>
      </div>

      {/* Upload Files */}
      <div style={{ 
        marginBottom: "1.5rem", 
        padding: "1rem", 
        backgroundColor: "white", 
        borderRadius: "8px",
        border: "1px solid #ddd"
      }}>
        <label style={{ fontWeight: "bold", color: "#555", display: "block", marginBottom: "0.5rem" }}>
          3. ⬆️ Upload Files to: <span style={{ color: selectedFolder ? "#2196f3" : "#999" }}>
            {selectedFolder || "(no folder selected)"}
          </span>
        </label>
        <input 
          type="file" 
          multiple 
          onChange={(e) => setFiles([...e.target.files])}
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "0.75rem",
            fontSize: "16px",
            border: "2px dashed #ddd",
            borderRadius: "6px",
            backgroundColor: isLoading ? "#f5f5f5" : "white",
            marginBottom: "1rem"
          }}
        />
        
        {files.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <p style={{ fontWeight: "bold", color: "#333" }}>Selected Files ({files.length}):</p>
            <ul style={{ margin: "0.5rem 0", paddingLeft: "1.5rem", color: "#666" }}>
              {Array.from(files).slice(0, 5).map((file, idx) => (
                <li key={idx} style={{ marginBottom: "0.25rem" }}>
                  📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </li>
              ))}
              {files.length > 5 && (
                <li style={{ color: "#999", fontStyle: "italic" }}>
                  ... and {files.length - 5} more files
                </li>
              )}
            </ul>
          </div>
        )}

        <button 
          onClick={uploadFiles} 
          disabled={isLoading || !selectedFolder || !files.length}
          style={{
            width: "100%",
            padding: "1rem",
            fontSize: "18px",
            fontWeight: "bold",
            backgroundColor: isLoading || !selectedFolder || !files.length ? "#ccc" : "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: isLoading || !selectedFolder || !files.length ? "not-allowed" : "pointer"
          }}
        >
          {isLoading ? "Uploading..." : `Upload ${files.length} File(s)`}
        </button>
      </div>

      {/* Status Messages */}
      {status && (
        <div style={{ 
          padding: "1rem", 
          backgroundColor: status.includes('❌') ? "#ffebee" : 
                          status.includes('🔄') ? "#e3f2fd" : "#e8f5e8",
          borderRadius: "8px",
          border: `2px solid ${status.includes('❌') ? "#f44336" : 
                                status.includes('🔄') ? "#2196f3" : "#4CAF50"}`,
          fontWeight: "bold",
          color: status.includes('❌') ? "#d32f2f" : 
                 status.includes('🔄') ? "#1976d2" : "#2e7d32"
        }}>
          {status}
        </div>
      )}
    </div>
  );
}

export default App;







//////////////////////////// Demo Code Working to render the required UI ////////////////////////////
// import { useEffect, useState } from "react";

// function App() {
//   const [folderList, setFolderList] = useState(["Documents", "Images", "Projects"]); // Demo folders
//   const [selectedFolder, setSelectedFolder] = useState("");
//   const [newFolderName, setNewFolderName] = useState("");
//   const [files, setFiles] = useState([]);
//   const [status, setStatus] = useState("");
//   const [isLoading, setIsLoading] = useState(false);

//   // Demo function to simulate loading folders
//   const loadFolders = async () => {
//     setIsLoading(true);
//     setStatus("🔄 Loading folders...");
    
//     // Simulate network delay
//     await new Promise(resolve => setTimeout(resolve, 1000));
    
//     setIsLoading(false);
//     setStatus("✅ Folders loaded successfully!");
    
//     // Clear status after 2 seconds
//     setTimeout(() => setStatus(""), 2000);
//   };

//   // Create folder (demo version)
//   const createFolder = async () => {
//     if (!newFolderName.trim()) {
//       alert("Please enter a folder name.");
//       return;
//     }
    
//     if (folderList.includes(newFolderName)) {
//       alert("Folder already exists!");
//       return;
//     }

//     setIsLoading(true);
//     setStatus("🔄 Creating folder...");
    
//     // Simulate network delay
//     await new Promise(resolve => setTimeout(resolve, 1500));
    
//     setFolderList(prev => [...prev, newFolderName]);
//     setStatus(`✅ Created folder: ${newFolderName}`);
//     setNewFolderName("");
//     setIsLoading(false);
    
//     // Clear status after 3 seconds
//     setTimeout(() => setStatus(""), 3000);
//   };

//   // Upload files (demo version)
//   const uploadFiles = async () => {
//     if (!selectedFolder) {
//       alert("Please select a folder.");
//       return;
//     }
    
//     if (!files.length) {
//       alert("No files selected.");
//       return;
//     }

//     setIsLoading(true);
//     setStatus(`🔄 Uploading ${files.length} file(s) to ${selectedFolder}...`);
    
//     try {
//       // Simulate upload progress
//       for (let i = 0; i < files.length; i++) {
//         await new Promise(resolve => setTimeout(resolve, 800));
//         setStatus(`🔄 Uploading file ${i + 1} of ${files.length}: ${files[i].name}`);
//       }
      
//       setStatus(`✅ Successfully uploaded ${files.length} file(s) to ${selectedFolder}!`);
//       setFiles([]);
      
//       // Reset file input
//       const fileInput = document.querySelector('input[type="file"]');
//       if (fileInput) fileInput.value = '';
      
//     } catch (err) {
//       setStatus("❌ Upload failed: " + err.message);
//     } finally {
//       setIsLoading(false);
//       // Clear status after 4 seconds
//       setTimeout(() => setStatus(""), 4000);
//     }
//   };

//   useEffect(() => {
//     loadFolders();
//   }, []);

//   return (
//     <div style={{ 
//       padding: "2rem", 
//       fontFamily: "sans-serif", 
//       maxWidth: "700px", 
//       margin: "auto",
//       backgroundColor: "#f9f9f9",
//       borderRadius: "10px",
//       boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
//     }}>
//       <h2 style={{ textAlign: "center", color: "#333", marginBottom: "2rem" }}>
//         📂 Azure Folder Uploader
//       </h2>
      
//       {/* Loading Spinner */}
//       {isLoading && (
//         <div style={{ 
//           textAlign: "center", 
//           margin: "1rem 0",
//           padding: "1rem",
//           backgroundColor: "#e3f2fd",
//           borderRadius: "8px",
//           border: "1px solid #2196f3"
//         }}>
//           <div style={{
//             display: "inline-block",
//             width: "20px",
//             height: "20px",
//             border: "3px solid #f3f3f3",
//             borderTop: "3px solid #2196f3",
//             borderRadius: "50%",
//             animation: "spin 1s linear infinite",
//             marginRight: "10px"
//           }}></div>
//           Processing...
//           <style>{`
//             @keyframes spin {
//               0% { transform: rotate(0deg); }
//               100% { transform: rotate(360deg); }
//             }
//           `}</style>
//         </div>
//       )}

//       {/* 1. Select Existing Folders */}
//       <div style={{ 
//         marginBottom: "1.5rem", 
//         padding: "1rem", 
//         backgroundColor: "white", 
//         borderRadius: "8px",
//         border: "1px solid #ddd"
//       }}>
//         <label style={{ fontWeight: "bold", color: "#555", display: "block", marginBottom: "0.5rem" }}>
//           1. 📁 Select Existing Folder:
//         </label>
//         <select 
//           value={selectedFolder} 
//           onChange={(e) => setSelectedFolder(e.target.value)}
//           disabled={isLoading}
//           style={{
//             width: "100%",
//             padding: "0.75rem",
//             fontSize: "16px",
//             border: "2px solid #ddd",
//             borderRadius: "6px",
//             backgroundColor: isLoading ? "#f5f5f5" : "white"
//           }}
//         >
//           <option value="">-- Choose a folder --</option>
//           {folderList.map((folder, idx) => (
//             <option key={idx} value={folder}>
//               📁 {folder}
//             </option>
//           ))}
//         </select>
//         {selectedFolder && (
//           <p style={{ marginTop: "0.5rem", color: "#2196f3", fontWeight: "bold" }}>
//             ✅ Selected: {selectedFolder}
//           </p>
//         )}
//       </div>

//       {/* 2. Create New Folder */}
//       <div style={{ 
//         marginBottom: "1.5rem", 
//         padding: "1rem", 
//         backgroundColor: "white", 
//         borderRadius: "8px",
//         border: "1px solid #ddd"
//       }}>
//         <label style={{ fontWeight: "bold", color: "#555", display: "block", marginBottom: "0.5rem" }}>
//           2. ➕ Create New Folder:
//         </label>
//         <div style={{ display: "flex", gap: "0.5rem" }}>
//           <input
//             type="text"
//             value={newFolderName}
//             onChange={(e) => setNewFolderName(e.target.value)}
//             placeholder="e.g. project-alpha, documents-2024"
//             disabled={isLoading}
//             style={{
//               flex: 1,
//               padding: "0.75rem",
//               fontSize: "16px",
//               border: "2px solid #ddd",
//               borderRadius: "6px",
//               backgroundColor: isLoading ? "#f5f5f5" : "white"
//             }}
//           />
//           <button 
//             onClick={createFolder} 
//             disabled={isLoading || !newFolderName.trim()}
//             style={{
//               padding: "0.75rem 1.5rem",
//               fontSize: "16px",
//               backgroundColor: isLoading || !newFolderName.trim() ? "#ccc" : "#4CAF50",
//               color: "white",
//               border: "none",
//               borderRadius: "6px",
//               cursor: isLoading || !newFolderName.trim() ? "not-allowed" : "pointer",
//               fontWeight: "bold"
//             }}
//           >
//             {isLoading ? "Creating..." : "Create"}
//           </button>
//         </div>
//       </div>

//       {/* 3. Upload Files */}
//       <div style={{ 
//         marginBottom: "1.5rem", 
//         padding: "1rem", 
//         backgroundColor: "white", 
//         borderRadius: "8px",
//         border: "1px solid #ddd"
//       }}>
//         <label style={{ fontWeight: "bold", color: "#555", display: "block", marginBottom: "0.5rem" }}>
//           3. ⬆️ Upload Files to: <span style={{ color: selectedFolder ? "#2196f3" : "#999" }}>
//             {selectedFolder || "(no folder selected)"}
//           </span>
//         </label>
//         <input 
//           type="file" 
//           multiple 
//           onChange={(e) => setFiles([...e.target.files])}
//           disabled={isLoading}
//           style={{
//             width: "100%",
//             padding: "0.75rem",
//             fontSize: "16px",
//             border: "2px dashed #ddd",
//             borderRadius: "6px",
//             backgroundColor: isLoading ? "#f5f5f5" : "white",
//             marginBottom: "1rem"
//           }}
//         />
        
//         {files.length > 0 && (
//           <div style={{ marginBottom: "1rem" }}>
//             <p style={{ fontWeight: "bold", color: "#333" }}>Selected Files ({files.length}):</p>
//             <ul style={{ margin: "0.5rem 0", paddingLeft: "1.5rem", color: "#666" }}>
//               {Array.from(files).slice(0, 5).map((file, idx) => (
//                 <li key={idx} style={{ marginBottom: "0.25rem" }}>
//                   📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
//                 </li>
//               ))}
//               {files.length > 5 && (
//                 <li style={{ color: "#999", fontStyle: "italic" }}>
//                   ... and {files.length - 5} more files
//                 </li>
//               )}
//             </ul>
//           </div>
//         )}

//         <button 
//           onClick={uploadFiles} 
//           disabled={isLoading || !selectedFolder || !files.length}
//           style={{
//             width: "100%",
//             padding: "1rem",
//             fontSize: "18px",
//             fontWeight: "bold",
//             backgroundColor: isLoading || !selectedFolder || !files.length ? "#ccc" : "#2196F3",
//             color: "white",
//             border: "none",
//             borderRadius: "6px",
//             cursor: isLoading || !selectedFolder || !files.length ? "not-allowed" : "pointer"
//           }}
//         >
//           {isLoading ? "Uploading..." : `Upload ${files.length} File(s)`}
//         </button>
//       </div>

//       {/* 4. Status Messages */}
//       {status && (
//         <div style={{ 
//           padding: "1rem", 
//           backgroundColor: status.includes('❌') ? "#ffebee" : 
//                           status.includes('🔄') ? "#e3f2fd" : "#e8f5e8",
//           borderRadius: "8px",
//           border: `2px solid ${status.includes('❌') ? "#f44336" : 
//                                 status.includes('🔄') ? "#2196f3" : "#4CAF50"}`,
//           fontWeight: "bold",
//           color: status.includes('❌') ? "#d32f2f" : 
//                  status.includes('🔄') ? "#1976d2" : "#2e7d32"
//         }}>
//           {status}
//         </div>
//       )}

//       <div style={{ 
//         marginTop: "2rem", 
//         padding: "1rem", 
//         backgroundColor: "#fff3e0", 
//         borderRadius: "8px",
//         border: "1px solid #ff9800",
//         fontSize: "14px",
//         color: "#e65100"
//       }}>
//         <strong>Demo Mode:</strong> This is a demonstration version. To connect to actual Azure Storage, 
//         update the configuration values in App.jsx with your real Azure credentials.
//       </div>
//     </div>
//   );
// }

// export default App;