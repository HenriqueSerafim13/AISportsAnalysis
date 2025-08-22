import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  LinearProgress,
  Button,
  Stack,
  Alert,
} from '@mui/material';
import {
  RssFeed as FeedsIcon,
  Article as ArticlesIcon,
  TrendingUp as TrendingIcon,
  Psychology as AnalysisIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { format } from 'date-fns';
import { feedsApi, articlesApi, healthApi } from '../services/api';
import { Feed, Article } from '../types';

const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: feeds = [] } = useQuery<Feed[]>('feeds', feedsApi.getAll);
  const { data: articlesData } = useQuery('articles', () => articlesApi.getAll({ limit: 10 }));
  const { data: recentArticles = [] } = useQuery<Article[]>('recentArticles', () => articlesApi.getRecent(7));
  const { data: stats } = useQuery('stats', articlesApi.getStats);
  const { data: health } = useQuery('health', healthApi.check);

  const fetchAllMutation = useMutation(feedsApi.fetchAll, {
    onSuccess: () => {
      queryClient.invalidateQueries('feeds');
      queryClient.invalidateQueries('articles');
    },
  });

  const enabledFeeds = feeds.filter(feed => feed.enabled);
  const disabledFeeds = feeds.filter(feed => !feed.enabled);

  const handleFetchAll = () => {
    if (window.confirm('Fetch all enabled RSS feeds? This may take a few moments.')) {
      fetchAllMutation.mutate();
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Dashboard</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleFetchAll}
            disabled={fetchAllMutation.isLoading}
          >
            {fetchAllMutation.isLoading ? 'Fetching...' : 'Fetch All Feeds'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => queryClient.invalidateQueries()}
          >
            Refresh All
          </Button>
        </Stack>
      </Box>

      {/* Health Status */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          System Status
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Box display="flex" alignItems="center">
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: health?.services?.ollama === 'ok' ? 'success.main' : 'error.main',
                  mr: 1,
                }}
              />
              <Typography variant="body2">
                Ollama: {health?.services?.ollama === 'ok' ? 'Connected' : 'Disconnected'}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box display="flex" alignItems="center">
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                  mr: 1,
                }}
              />
              <Typography variant="body2">
                Database: Connected
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <FeedsIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">{feeds.length}</Typography>
              </Box>
              <Typography color="textSecondary" gutterBottom>
                Total Feeds
              </Typography>
              <Box display="flex" justifyContent="space-between">
                <Chip
                  label={`${enabledFeeds.length} Active`}
                  size="small"
                  color="success"
                />
                <Chip
                  label={`${disabledFeeds.length} Disabled`}
                  size="small"
                  color="default"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <ArticlesIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">{stats?.total || 0}</Typography>
              </Box>
              <Typography color="textSecondary" gutterBottom>
                Total Articles
              </Typography>
              <Typography variant="body2">
                {recentArticles.length} new this week
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  {feeds.length > 0 ? Math.round((enabledFeeds.length / feeds.length) * 100) : 0}%
                </Typography>
              </Box>
              <Typography color="textSecondary" gutterBottom>
                Feed Activity
              </Typography>
              <LinearProgress
                variant="determinate"
                value={feeds.length > 0 ? (enabledFeeds.length / feeds.length) * 100 : 0}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <AnalysisIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">AI Ready</Typography>
              </Box>
              <Typography color="textSecondary" gutterBottom>
                Analysis Status
              </Typography>
              <Typography variant="body2" color="success.main">
                {health?.services?.ollama === 'ok' ? 'Available' : 'Unavailable'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Articles */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Articles
            </Typography>
            <List>
              {articlesData?.articles?.slice(0, 5).map((article) => (
                <ListItem key={article.id} divider>
                  <ListItemText
                    primary={article.title}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          {article.feed_title} • {format(new Date(article.published_at || ''), 'MMM dd, yyyy')}
                        </Typography>
                        <Typography variant="body2" noWrap>
                          {article.summary}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Feed Status
            </Typography>
            <List>
              {feeds.slice(0, 5).map((feed) => (
                <ListItem key={feed.id} divider>
                  <ListItemText
                    primary={feed.title}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          {feed.last_fetched
                            ? `Last fetched: ${format(new Date(feed.last_fetched), 'MMM dd, HH:mm')}`
                            : 'Never fetched'}
                        </Typography>
                        <Chip
                          label={feed.enabled ? 'Active' : 'Disabled'}
                          size="small"
                          color={feed.enabled ? 'success' : 'default'}
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Success/Error Alerts */}
      {fetchAllMutation.isSuccess && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Successfully initiated fetch for all enabled feeds.
        </Alert>
      )}

      {fetchAllMutation.error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to fetch feeds. Please try again.
        </Alert>
      )}
    </Box>
  );
};

export default Dashboard;
