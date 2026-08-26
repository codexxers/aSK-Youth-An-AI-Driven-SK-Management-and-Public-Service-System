# Model Download and Setup

The LLMA3BGGUF model files are hosted externally on Google Drive due to their large size.

Google Drive folder:
https://drive.google.com/drive/folders/1IuUkYLv5RQev5-5lb6xFhsmyt46NyUS1?usp=sharing

Manual download:
1. Open the Drive link in your browser.
2. Select the `LLMA3BGGUF` folder and choose "Download". Google Drive will create a zip.
3. Extract the downloaded zip into the project root so the path `LLMA3BGGUF/Llama-3.2-3B-Instruct-Q4_K_M.gguf` exists.

Programmatic download (recommended for large files):

- rclone (recommended and resumable)
  1. Install and configure rclone: https://rclone.org/
  2. Configure a remote named `gdrive` with `rclone config`.
  3. Run:
     rclone copy --progress gdrive:1IuUkYLv5RQev5-5lb6xFhsmyt46NyUS1 ./LLMA3BGGUF

- If you have uploaded a single zip file and know its file id, use `gdown` (Linux/macOS):
  ```bash
  pip install gdown
  gdown 'https://drive.google.com/uc?id=FILE_ID' -O model.zip
  unzip model.zip -d LLMA3BGGUF
  ```

After placing the model folder in the project root, run the backend:

```powershell
cd backend
npm start
```

Verify logs show "Llama 3 VRAM Mount Success!" before using the app.
