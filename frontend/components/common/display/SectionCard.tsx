// components/common/display/SectionCard.tsx
import React from 'react';

import { Box, Paper, Stack, Typography } from '@mui/material';

export const SectionCard = React.memo(({
    icon,
    title,
    children,
    isEditMode,
}: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
    isEditMode: boolean;
}) => (
    <Paper
        elevation={0}
        sx={{
            p: 3,
            mb: 3,
            borderRadius: 1,
            border: '1px solid',
            borderColor: isEditMode ? 'primary.main' : 'divider',
            transition: 'all 0.2s',
            bgcolor: isEditMode ? 'primary.50' : 'background.paper',
            '&:hover': {
                boxShadow: 1,
            }
        }}>
        <Stack direction='row' alignItems='center' spacing={1} sx={{ mb: 2 }}>
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: isEditMode ? 'primary.100' : 'primary.50',
                color: 'primary.main'
            }}>
                {icon}
            </Box>
            <Typography variant='h6' component='div' color='primary.main' >
                {title}
            </Typography>
        </Stack>
        <Box>
            {children}
        </Box>
    </Paper>
))

SectionCard.displayName = 'SectionCard';