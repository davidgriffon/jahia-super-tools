import {Box, Card, CardContent, LinearProgress, Stack, Typography} from '@mui/material';
import {formatBytes, formatNumber} from '../../shared/format';

function Stat({label, value, color}) {
    return (
        <Box sx={{display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.25}}>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography variant="body2" fontWeight={600} color={color}>{value}</Typography>
        </Box>
    );
}

export default function CacheStatistics({stats}) {
    if (!stats) {
        return null;
    }
    const hits = stats.cacheHitCount || 0;
    const misses = stats.cacheMissCount || 0;
    const total = hits + misses;
    const hitRate = total > 0 ? (hits / total) * 100 : 0;

    return (
        <Stack direction={{xs: 'column', md: 'row'}} spacing={2} sx={{mb: 2}} data-testid="cache-stats">
            <Card sx={{flex: 1}}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Performance</Typography>
                    <Stat label="Cache hits" value={formatNumber(hits)} color="success.main"/>
                    <Stat label="Cache misses" value={formatNumber(misses)} color="warning.main"/>
                    <Stat label="Hit rate" value={`${hitRate.toFixed(2)} %`} color="primary.main"/>
                    <Stat label="Memory hits" value={formatNumber(stats.localHeapHitCount)}/>
                    <Stat label="Disk hits" value={formatNumber(stats.localDiskHitCount)}/>
                </CardContent>
            </Card>
            <Card sx={{flex: 1}}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Size</Typography>
                    <Stat label="Total entries" value={formatNumber(stats.size)}/>
                    <Stat label="Total size" value={formatBytes(stats.totalSizeBytes)}/>
                    <Stat label="Memory store" value={`${formatNumber(stats.memoryStoreSize)} entries`}/>
                    <Stat label="Disk store" value={`${formatNumber(stats.diskStoreSize)} entries`}/>
                </CardContent>
            </Card>
            <Card sx={{flex: 1}}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Hit rate</Typography>
                    <LinearProgress
                        variant="determinate"
                        value={hitRate}
                        color={hitRate >= 80 ? 'success' : hitRate >= 50 ? 'primary' : 'warning'}
                        sx={{height: 18, borderRadius: 1}}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{display: 'block', mt: 1}}>
                        {formatNumber(total)} requests, {hitRate.toFixed(2)} % served from cache
                    </Typography>
                    {total > 0 && hitRate < 50 && (
                        <Typography variant="caption" color="warning.main">Cache performance could be improved</Typography>
                    )}
                </CardContent>
            </Card>
        </Stack>
    );
}
