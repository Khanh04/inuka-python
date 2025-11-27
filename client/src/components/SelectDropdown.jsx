import React from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const SelectDropdown = ({ label, value, onChange, options, width = 200, ...props }) => {
  return (
    <FormControl {...props}>
      <InputLabel id={`${label}-helper-label`}>{label}</InputLabel>
      <Select
        labelId={`${label}-helper-label`}
        id={`${label}-select`}
        value={value || ''}
        onChange={onChange}
        label={label}
        style={{ width }}
      >
        {options.map(({ text, value: optionValue }) => (
          <MenuItem key={optionValue} value={optionValue}>
            {text}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default SelectDropdown;