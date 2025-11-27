import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  TextField, Select, MenuItem, Checkbox, Button,
} from '@mui/material';

const ParametersTable = ({
  pdfDoc,
  pdfPageParams,
  params,
  page,
  onUpdateParam,
  onDeleteParam,
  renderParamsOnImage,
}) => {
  const columns = [
    { name: 'ID', width: 100 },
    { name: 'Type', width: 100 },
    { name: 'Is\nMultiline', width: 100 },
    { name: 'Page', width: 100 },
    { name: 'X1, Y1', width: 100 },
    { name: 'X2, Y2', width: 100 },
    { name: 'Actions', width: 100 },
  ];

  const handleParamChange = (pageNum, index, field, value) => {
    const newParams = [...(pdfPageParams[pageNum] || [])];
    newParams[index][field] = value;
    onUpdateParam(pageNum, newParams);
    if (Number(pageNum) === page) {
      renderParamsOnImage(page);
    }
  };

  const handleDelete = (pageNum, index) => {
    onDeleteParam(pageNum, index);
  };

  return (
    <TableContainer component={Paper}>
      <Table sx={{ tableLayout: 'fixed' }}>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col.name} sx={{ width: col.width, textAlign: 'center', border: '1px solid black' }}>
                {col.name.split('\n').map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < col.name.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfDoc ? (
            !Object.keys(pdfPageParams)?.length ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', fontStyle: 'italic', color: '#777', border: '1px solid black' }}>
                  No parameters defined for this page
                </TableCell>
              </TableRow>
            ) : (
              Object.keys(pdfPageParams)
                .sort((a, b) => Number(a) - Number(b))
                .map((pageNum) => (
                  <React.Fragment key={pageNum}>
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        sx={{
                          backgroundColor: Number(pageNum) === page ? '#d9edf7' : '#f5f5f5',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          border: '1px solid black',
                        }}
                      >
                        Page {pageNum} {Number(pageNum) === page ? '(Current)' : ''}
                      </TableCell>
                    </TableRow>
                    {!pdfPageParams[pageNum]?.length ? (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ textAlign: 'center', fontStyle: 'italic', color: '#777', border: '1px solid black' }}>
                          No parameters defined for this page
                        </TableCell>
                      </TableRow>
                    ) : (
                      pdfPageParams[pageNum].map((param, index) => (
                        <TableRow key={index} sx={{ opacity: Number(pageNum) === page ? 1 : 0.7 }}>
                          <TableCell sx={{ border: '1px solid black' }}>
                            <TextField
                              value={param.id}
                              onChange={(e) => handleParamChange(pageNum, index, 'id', e.target.value)}
                              disabled={Number(pageNum) !== page}
                              fullWidth
                            />
                          </TableCell>
                          <TableCell sx={{ border: '1px solid black' }}>
                            <Select
                              value={param.type}
                              onChange={(e) => handleParamChange(pageNum, index, 'type', e.target.value)}
                              disabled={Number(pageNum) !== page}
                              fullWidth
                            >
                              {['string', 'date', 'number', 'currency'].map((type) => (
                                <MenuItem key={type} value={type}>{type}</MenuItem>
                              ))}
                            </Select>
                          </TableCell>
                          <TableCell sx={{ border: '1px solid black', textAlign: 'center' }}>
                            <Checkbox
                              checked={param.isMultiline || false}
                              onChange={(e) => handleParamChange(pageNum, index, 'isMultiline', e.target.checked)}
                              disabled={Number(pageNum) !== page}
                            />
                          </TableCell>
                          <TableCell sx={{ border: '1px solid black', textAlign: 'center', fontWeight: Number(pageNum) === page ? 'bold' : 'normal', color: Number(pageNum) === page ? '#007BFF' : 'inherit' }}>
                            {pageNum}
                          </TableCell>
                          <TableCell sx={{ border: '1px solid black' }}>{`(${param.x1}, ${param.y1})`}</TableCell>
                          <TableCell sx={{ border: '1px solid black' }}>{`(${param.x2}, ${param.y2})`}</TableCell>
                          <TableCell sx={{ border: '1px solid black' }}>
                            <Button
                              variant="contained"
                              color="primary"
                              onClick={() => handleDelete(pageNum, index)}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </React.Fragment>
                ))
            )
          ) : (
            params.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', fontStyle: 'italic', color: '#777', border: '1px solid black' }}>
                  No parameters defined
                </TableCell>
              </TableRow>
            ) : (
              params.map((param, index) => (
                <TableRow key={index}>
                  <TableCell sx={{ border: '1px solid black' }}>
                    <TextField
                      value={param.id}
                      onChange={(e) => {
                        const newParams = [...params];
                        newParams[index].id = e.target.value;
                        onUpdateParam(null, newParams);
                        renderParamsOnImage(page);
                      }}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black' }}>
                    <Select
                      value={param.type}
                      onChange={(e) => {
                        const newParams = [...params];
                        newParams[index].type = e.target.value;
                        onUpdateParam(null, newParams);
                      }}
                      fullWidth
                    >
                      {['string', 'date', 'number', 'currency'].map((type) => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', textAlign: 'center' }}>
                    <Checkbox
                      checked={param.isMultiline || false}
                      onChange={(e) => {
                        const newParams = [...params];
                        newParams[index].isMultiline = e.target.checked;
                        onUpdateParam(null, newParams);
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', textAlign: 'center' }}>N/A</TableCell>
                  <TableCell sx={{ border: '1px solid black' }}>{`(${param.x1}, ${param.y1})`}</TableCell>
                  <TableCell sx={{ border: '1px solid black' }}>{`(${param.x2}, ${param.y2})`}</TableCell>
                  <TableCell sx={{ border: '1px solid black' }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => {
                        const newParams = [...params];
                        newParams.splice(index, 1);
                        onUpdateParam(null, newParams);
                        renderParamsOnImage(page);
                      }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ParametersTable;