'use client';

import React from "react";
import { useRouter } from "next/navigation";
import {
    Container,
    Paper,
    Typography,
    Button,
    Box,
} from '@mui/material';
import {
    Block as BlockIcon,
    Home as HomeIcon,
    ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';

export default function UnauthorizedPage() {
    const router = useRouter();

    return (
        <Container component='main' maxWidth='sm'>
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}
            >
                <Paper
                    elevation={3}
                    sx={{
                        padding: 4,
                        width: '100%',
                        textAlign: 'center',
                    }}
                >
                    <Box
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            backgroundColor: 'error.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                        }}
                    >
                        <BlockIcon sx={{ color: 'white', fontSize: 40 }} />
                    </Box>

                    <Typography variant="h4" component='h1' gutterBottom>
                        アクセス権限がありません
                    </Typography>

                    <Typography variant="body1" color='text.secondary' paragraph >
                        このページへのアクセスには管理者権限が必要です。
                    </Typography>

                    <Typography variant='body2' color='text.secondary'>
                        アクセス権限が必要な場合は、システム管理者にお問合せください。
                    </Typography>

                    <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBackIcon />}
                            onClick={() => router.back()}
                        >
                            戻る
                        </Button>
                        <Button
                        variant='contained'
                        startIcon={<HomeIcon />}
                        onClick={() => router.push('/dashboard')}
                        >
                            ダッシュボードへ
                        </Button>

                    </Box>

                </Paper>

            </Box>

        </Container>
    );
}