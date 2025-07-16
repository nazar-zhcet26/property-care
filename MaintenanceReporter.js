import { useState, useRef, useEffect } from 'react';
import { maintenanceAPI } from './supabase';

const MaintenanceReporter = () => {
  const [reports, setReports] = useState([]);
  const [currentReport, setCurrentReport] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    urgency: 'medium',
    photos: [],
    videos: []
  });
  const [showForm, setShowForm] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const data = await maintenanceAPI.getReports();
      setReports(data);
    } catch (error) {
      alert('Error loading reports');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setCurrentReport(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (files, type) => {
    const newFiles = [];

    for (let file of files) {
      if (type === 'photos' && file.type.startsWith('image/')) {
        newFiles.push({
          id: Date.now() + Math.random(),
          file,
          url: URL.createObjectURL(file),
          name: file.name,
          size: file.size
        });
      } else if (type === 'videos' && file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.preload = 'metadata';

        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            newFiles.push({
              id: Date.now() + Math.random(),
              file,
              url: URL.createObjectURL(file),
              name: file.name,
              size: file.size,
              duration: video.duration
            });
            resolve();
          };
          video.src = URL.createObjectURL(file);
        });
      }
    }

    setCurrentReport(prev => ({
      ...prev,
      [type]: [...prev[type], ...newFiles]
    }));
  };

  const submitReport = async () => {
    setIsSubmitting(true);
    try {
      const report = await maintenanceAPI.submitReport(currentReport);
      const allFiles = [...currentReport.photos, ...currentReport.videos];

      for (const fileData of allFiles) {
        const uploadResult = await maintenanceAPI.uploadFile(fileData.file, report.id);
        await maintenanceAPI.saveAttachment({
          report_id: report.id,
          file_name: fileData.name,
          file_path: uploadResult.path,
          file_type: fileData.file.type,
          file_size: fileData.size,
          duration: fileData.duration || null
        });
      }

      setCurrentReport({
        title: '',
        description: '',
        category: '',
        location: '',
        urgency: 'medium',
        photos: [],
        videos: []
      });
      await loadReports();
      alert('Report submitted!');
      setShowForm(false);
    } catch (err) {
      alert('Error submitting report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 text-white">
      <h2 className="text-xl mb-4">Submit Maintenance Report</h2>
      <input value={currentReport.title} onChange={(e) => handleInputChange('title', e.target.value)} placeholder="Title" />
      <textarea value={currentReport.description} onChange={(e) => handleInputChange('description', e.target.value)} placeholder="Description" />
      <button onClick={submitReport} disabled={isSubmitting}>Submit</button>
    </div>
  );
};

export default MaintenanceReporter;
