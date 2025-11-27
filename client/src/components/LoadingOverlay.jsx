import React from 'react';
import { Box, Typography } from '@mui/material';

const LoadingOverlay = ({ open, text, progress }) => {
  if (!open) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        bgcolor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <Box
        sx={{
          border: '16px solid #f3f3f3',
          borderTop: '16px solid #007BFF',
          borderRadius: '50%',
          width: 80,
          height: 80,
          animation: 'spin 2s linear infinite',
          mb: 2,
        }}
      />
      <Typography sx={{ color: 'white', fontSize: '18px', mb: 1 }}>{text}</Typography>
      <Box sx={{ width: 300, bgcolor: '#f3f3f3', borderRadius: '5px' }}>
        <Box sx={{ width: `${progress}%`, height: 20, bgcolor: '#007BFF', borderRadius: '5px', transition: 'width 0.3s' }} />
      </Box>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
};

export default LoadingOverlay;