import {createTheme} from '@mui/material/styles';

/** Shared look of the Super Tools React apps, aligned with the Support Tools palette. */
const theme = createTheme({
    palette: {
        primary: {main: '#0072B1'},
        secondary: {main: '#7E8386'},
        success: {main: '#198754'},
        warning: {main: '#e0a800'},
        error: {main: '#B40000'},
        info: {main: '#0dcaf0'},
        background: {default: '#ffffff', paper: '#ffffff'},
        text: {primary: '#293136'}
    },
    typography: {
        fontFamily: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'].join(','),
        fontSize: 13,
        h5: {fontSize: '1.25rem', fontWeight: 600},
        h6: {fontSize: '1rem', fontWeight: 600}
    },
    components: {
        MuiButton: {styleOverrides: {root: {textTransform: 'none'}}},
        MuiChip: {styleOverrides: {root: {borderRadius: 4}}},
        MuiCard: {defaultProps: {variant: 'outlined'}},
        MuiPaper: {defaultProps: {variant: 'outlined'}},
        MuiTableCell: {styleOverrides: {root: {padding: '6px 10px'}}}
    }
});

export default theme;
