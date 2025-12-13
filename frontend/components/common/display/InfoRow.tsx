// components/common/display/InfoRow.tsx
import React from 'react';

import { Box, Typography } from '@mui/material';

export const InfoRow = React.memo(({
    label,
    value,
    editComponent,
    isEditMode,
}: {
    label: string;
    value: React.ReactNode;
    editComponent?: React.ReactNode;
    isEditMode: boolean;
}) => (
    <Box sx={{ mb: 2 }}>
        <Typography
            variant='caption'
            color='text.secondary'
            sx={{

            }}
        >
            {label}
        </Typography>
        <Box sx={{ mt: 0.5 }}>
            {isEditMode && editComponent ? editComponent : (
                <Typography variant='body1' component='div' fontWeight='bold'>
                    {value || '-'}
                </Typography>
            )}
        </Box>
    </Box>
))

InfoRow.displayName = 'InfoRow';