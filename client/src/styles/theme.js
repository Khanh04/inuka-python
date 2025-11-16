// src/styles/theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#007BFF', 
      contrastText: '#FFFFFF', 
    },
    secondary: {
      main: '#6C757D',
    },
    success: {
      main: '#28A745', 
    },
    background: {
      default: '#f8f9fa',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#212529',
      secondary: '#777', 
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    h6: {
      fontWeight: 700, 
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', 
          borderRadius: 4,
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#0056b3',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          border: '1px solid black', 
          padding: '4px', 
        },
        head: {
          fontWeight: 'bold',
          textAlign: 'center',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            fontSize: '0.875rem', 
          },
        },
      },
    },
  },
});

export default theme;