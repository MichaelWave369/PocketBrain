interface CameraCaptureButtonProps {
  onCameraFile: (file: File) => Promise<void>;
  onUploadFile: (file: File) => Promise<void>;
}

export const CameraCaptureButton = ({ onCameraFile, onUploadFile }: CameraCaptureButtonProps) => (
  <div className="settings-actions">
    <label className="ghost import-button">
      📷 Take photo
      <input type="file" accept="image/*" capture="environment" onChange={(event) => event.target.files?.[0] && void onCameraFile(event.target.files[0])} />
    </label>
    <label className="ghost import-button">
      🖼️ Upload image
      <input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && void onUploadFile(event.target.files[0])} />
    </label>
  </div>
);
