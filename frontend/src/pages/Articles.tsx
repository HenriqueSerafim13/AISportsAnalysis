import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Grid,
  Pagination,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Tooltip,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Divider,
  Stack,
  Badge,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Psychology as AnalysisIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  DeleteSweep as BulkDeleteIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { format } from 'date-fns';
import { articlesApi, analysisApi, feedsApi } from '../services/api';
import { Article, Feed } from '../types';

const Articles: React.FC = () => {
  // Get saved limit from localStorage or default to 12
  const getSavedLimit = () => {
    const saved = localStorage.getItem('articlesPerPage');
    return saved ? parseInt(saved) : 12;
  };

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(getSavedLimit);
  const [search, setSearch] = useState('');
  const [selectedFeedId, setSelectedFeedId] = useState<number | ''>('');
  const [selectedArticles, setSelectedArticles] = useState<Set<number>>(new Set());
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
  const [openBulkDeleteDialog, setOpenBulkDeleteDialog] = useState(false);
  const [bulkDeleteType, setBulkDeleteType] = useState<'selected' | 'older' | 'search'>('selected');
  const [olderThanDays, setOlderThanDays] = useState(30);

  const queryClient = useQueryClient();
  const offset = (page - 1) * limit;

  // Fetch articles with filters
  const { data: articlesData, isLoading } = useQuery(
    ['articles', { limit, offset, search, feedId: selectedFeedId }],
    () => articlesApi.getAll({ 
      limit: limit === -1 ? undefined : limit, 
      offset: limit === -1 ? 0 : offset, 
      search, 
      feedId: selectedFeedId || undefined 
    }),
    { keepPreviousData: true }
  );

  // Fetch feeds for filter dropdown
  const { data: feeds } = useQuery(['feeds'], feedsApi.getAll);

  // Fetch detailed article with insights when dialog is open
  const { data: articleDetails, isLoading: isLoadingDetails } = useQuery(
    ['article-details', selectedArticleId],
    () => selectedArticleId ? articlesApi.getWithInsights(selectedArticleId) : null,
    { enabled: !!selectedArticleId && openDialog }
  );

  // Mutations
  const deleteMutation = useMutation(articlesApi.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('articles');
      setSelectedArticles(new Set());
    },
  });

  const bulkDeleteMutation = useMutation(articlesApi.bulkDelete, {
    onSuccess: () => {
      queryClient.invalidateQueries('articles');
      setSelectedArticles(new Set());
      setOpenBulkDeleteDialog(false);
    },
  });

  const analyzeMutation = useMutation(analysisApi.analyzeArticle, {
    onSuccess: (jobId) => {
      queryClient.invalidateQueries('articles');
      queryClient.invalidateQueries('article-details');
      console.log(`Analysis started for job: ${jobId}`);
    },
    onError: (error) => {
      console.error('Analysis failed:', error);
    },
  });

  // Handlers
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setPage(1);
  };

  const handleFeedFilter = (event: any) => {
    setSelectedFeedId(event.target.value);
    setPage(1);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleAnalyze = (articleId: number) => {
    analyzeMutation.mutate(articleId);
  };

  const handleDelete = (articleId: number) => {
    if (window.confirm('Are you sure you want to delete this article?')) {
      deleteMutation.mutate(articleId);
    }
  };

  const handleOpenArticle = (article: Article) => {
    setSelectedArticle(article);
    setSelectedArticleId(article.id!);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedArticle(null);
    setSelectedArticleId(null);
  };

  const handleSelectArticle = (articleId: number, checked: boolean) => {
    const newSelected = new Set(selectedArticles);
    if (checked) {
      newSelected.add(articleId);
    } else {
      newSelected.delete(articleId);
    }
    setSelectedArticles(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = articlesData?.articles?.map(article => article.id!) || [];
      setSelectedArticles(new Set(allIds));
    } else {
      setSelectedArticles(new Set());
    }
  };

  const handleBulkDelete = () => {
    let params: any = {};
    
    switch (bulkDeleteType) {
      case 'selected':
        params.ids = Array.from(selectedArticles);
        break;
      case 'older':
        params.olderThan = olderThanDays;
        break;
      case 'search':
        params.search = search;
        break;
    }

    bulkDeleteMutation.mutate(params);
  };

  const handleLimitChange = (event: any) => {
    const newLimit = event.target.value;
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
    localStorage.setItem('articlesPerPage', newLimit.toString()); // Save preference
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedFeedId('');
    setPage(1);
  };

  const isAllSelected = articlesData?.articles?.length > 0 && 
    articlesData.articles.every(article => selectedArticles.has(article.id!));

  const isSomeSelected = articlesData?.articles?.some(article => selectedArticles.has(article.id!));

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">
            Articles
            {selectedArticles.size > 0 && (
              <Badge badgeContent={selectedArticles.size} color="primary" sx={{ ml: 2 }}>
                <Chip label="Selected" color="primary" variant="outlined" />
              </Badge>
            )}
          </Typography>
          {articlesData?.pagination && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
              {limit === -1 
                ? `Showing all ${articlesData.pagination.total} articles`
                : `Showing ${offset + 1}-${Math.min(offset + limit, articlesData.pagination.total)} of ${articlesData.pagination.total} articles`
              }
            </Typography>
          )}
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => queryClient.invalidateQueries('articles')}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            placeholder="Search articles..."
            value={search}
            onChange={handleSearch}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            size="small"
            sx={{ minWidth: 200 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Feed Filter</InputLabel>
            <Select
              value={selectedFeedId}
              label="Feed Filter"
              onChange={handleFeedFilter}
            >
              <MenuItem value="">All Feeds</MenuItem>
              {feeds?.map((feed) => (
                <MenuItem key={feed.id} value={feed.id}>
                  {feed.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Per Page</InputLabel>
            <Select
              value={limit}
              label="Per Page"
              onChange={handleLimitChange}
            >
              <MenuItem value={6}>6 articles</MenuItem>
              <MenuItem value={12}>12 articles</MenuItem>
              <MenuItem value={24}>24 articles</MenuItem>
              <MenuItem value={50}>50 articles</MenuItem>
              <MenuItem value={100}>100 articles</MenuItem>
              <MenuItem value={-1}>Show All</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={handleClearFilters}
            size="small"
          >
            Clear Filters
          </Button>

          {selectedArticles.size > 0 && (
            <Button
              variant="contained"
              color="error"
              startIcon={<BulkDeleteIcon />}
              onClick={() => setOpenBulkDeleteDialog(true)}
            >
              Delete Selected ({selectedArticles.size})
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Select All Checkbox */}
      {articlesData?.articles && articlesData.articles.length > 0 && limit !== -1 && (
        <Box mb={2}>
          <FormControlLabel
            control={
              <Checkbox
                checked={isAllSelected}
                indeterminate={isSomeSelected && !isAllSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
            }
            label={`Select All (${selectedArticles.size} selected)`}
          />
        </Box>
      )}

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Articles Grid */}
      <Grid container spacing={3}>
        {articlesData?.articles?.map((article) => (
          <Grid item xs={12} sm={6} md={4} key={article.id}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="flex-start" gap={1}>
                  <Checkbox
                    checked={selectedArticles.has(article.id!)}
                    onChange={(e) => handleSelectArticle(article.id!, e.target.checked)}
                    size="small"
                  />
                  <Box flex={1}>
                    <Typography variant="h6" gutterBottom noWrap>
                      {article.title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      {article.feed_title} • {format(new Date(article.published_at || ''), 'MMM dd, yyyy')}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }} noWrap>
                      {article.summary}
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {article.author && (
                        <Chip label={article.author} size="small" variant="outlined" />
                      )}
                    </Box>
                  </Box>
                </Box>
              </CardContent>
              <CardActions>
                <Tooltip title="Analyze with AI">
                  <IconButton
                    size="small"
                    onClick={() => handleAnalyze(article.id!)}
                    disabled={analyzeMutation.isLoading}
                    color={analyzeMutation.isLoading ? "primary" : "default"}
                  >
                    {analyzeMutation.isLoading ? (
                      <Box sx={{ width: 16, height: 16 }}>
                        <CircularProgress size={16} />
                      </Box>
                    ) : (
                      <AnalysisIcon />
                    )}
                  </IconButton>
                </Tooltip>
                <Tooltip title="View Details">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenArticle(article)}
                  >
                    <OpenIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Article">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(article.id!)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Empty State */}
      {articlesData?.articles?.length === 0 && !isLoading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No articles found
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {search || selectedFeedId ? 'Try adjusting your filters' : 'Articles will appear here once RSS feeds are fetched'}
          </Typography>
        </Paper>
      )}

      {/* Pagination */}
      {articlesData?.pagination && limit !== -1 && articlesData.pagination.total > limit && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
          <Typography variant="body2" color="textSecondary">
            Page {page} of {Math.ceil(articlesData.pagination.total / limit)}
          </Typography>
          <Pagination
            count={Math.ceil(articlesData.pagination.total / limit)}
            page={page}
            onChange={handlePageChange}
            color="primary"
          />
          <Typography variant="body2" color="textSecondary">
            {articlesData.pagination.total} total articles
          </Typography>
        </Box>
      )}

      {/* Article Detail Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ flex: 1, pr: 2 }}>
              {selectedArticle?.title}
            </Typography>
            {selectedArticle && (
              <Button
                variant="contained"
                startIcon={<AnalysisIcon />}
                onClick={() => handleAnalyze(selectedArticle.id!)}
                disabled={analyzeMutation.isLoading}
                size="small"
              >
                {analyzeMutation.isLoading ? 'Analyzing...' : 'Analyze'}
              </Button>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {isLoadingDetails ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            selectedArticle && (
              <Box>
                {/* Article Metadata */}
                <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {selectedArticle.feed_title} • {format(new Date(selectedArticle.published_at || ''), 'MMM dd, yyyy HH:mm')}
                  </Typography>
                  {selectedArticle.author && (
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      By: {selectedArticle.author}
                    </Typography>
                  )}
                  <Button
                    variant="outlined"
                    href={selectedArticle.link}
                    target="_blank"
                    startIcon={<OpenIcon />}
                    size="small"
                    sx={{ mt: 1 }}
                  >
                    Read Original
                  </Button>
                </Paper>

                {/* Article Content */}
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom>
                    Content
                  </Typography>
                  <Typography variant="body1" paragraph sx={{ fontWeight: 500 }}>
                    {selectedArticle.summary}
                  </Typography>
                  {selectedArticle.content && selectedArticle.content !== selectedArticle.summary && (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {selectedArticle.content}
                    </Typography>
                  )}
                </Box>

                {/* AI Analysis Results */}
                {articleDetails?.insights && articleDetails.insights.length > 0 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      AI Analysis Results
                    </Typography>
                    {articleDetails.insights.map((insight: any, index: number) => (
                      <Paper key={index} sx={{ p: 2, mb: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Chip 
                            label={insight.agent === 'sports_specialist' ? 'Sports Specialist' : insight.agent} 
                            color="primary" 
                            size="small" 
                          />
                          <Typography variant="caption" color="textSecondary">
                            {format(new Date(insight.created_at), 'MMM dd, yyyy HH:mm')}
                          </Typography>
                        </Box>
                        
                        <Typography variant="body2" paragraph>
                          {insight.summary}
                        </Typography>

                        {/* Tags */}
                        {insight.tags && (
                          <Box mb={2}>
                            <Typography variant="caption" color="textSecondary">Tags:</Typography>
                            <Box display="flex" gap={1} flexWrap="wrap" mt={0.5}>
                              {JSON.parse(insight.tags || '[]').map((tag: string, tagIndex: number) => (
                                <Chip key={tagIndex} label={tag} size="small" variant="outlined" />
                              ))}
                            </Box>
                          </Box>
                        )}

                        {/* Entities */}
                        {insight.entities && (
                          <Box mb={2}>
                            <Typography variant="caption" color="textSecondary">Entities:</Typography>
                            <Box mt={0.5}>
                              {(() => {
                                try {
                                  const entities = JSON.parse(insight.entities || '{}');
                                  return Object.entries(entities).map(([key, values]: [string, any]) => (
                                    values && values.length > 0 && (
                                      <Box key={key} display="flex" gap={1} flexWrap="wrap" mb={1}>
                                        <Typography variant="caption" sx={{ minWidth: 60, textTransform: 'capitalize' }}>
                                          {key.replace('_', ' ')}:
                                        </Typography>
                                        {values.map((value: string, valueIndex: number) => (
                                          <Chip key={valueIndex} label={value} size="small" color="secondary" variant="outlined" />
                                        ))}
                                      </Box>
                                    )
                                  ));
                                } catch {
                                  return <Typography variant="caption" color="textSecondary">Invalid entities data</Typography>;
                                }
                              })()}
                            </Box>
                          </Box>
                        )}

                        {/* Confidence Score */}
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="caption" color="textSecondary">
                            Confidence Score: {Math.round((insight.score || 0) * 100)}%
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={(insight.score || 0) * 100} 
                            sx={{ width: 100, height: 4 }}
                          />
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                )}

                {/* No Analysis Message */}
                {(!articleDetails?.insights || articleDetails.insights.length === 0) && (
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      No AI analysis available for this article yet.
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Click "Analyze" to start AI analysis of this article.
                    </Typography>
                  </Paper>
                )}
              </Box>
            )
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={openBulkDeleteDialog} onClose={() => setOpenBulkDeleteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Delete Articles</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl>
              <InputLabel>Delete Type</InputLabel>
              <Select
                value={bulkDeleteType}
                label="Delete Type"
                onChange={(e) => setBulkDeleteType(e.target.value as any)}
              >
                <MenuItem value="selected">Selected Articles ({selectedArticles.size})</MenuItem>
                <MenuItem value="older">Articles Older Than</MenuItem>
                <MenuItem value="search">Articles Matching Search</MenuItem>
              </Select>
            </FormControl>

            {bulkDeleteType === 'older' && (
              <TextField
                type="number"
                label="Days"
                value={olderThanDays}
                onChange={(e) => setOlderThanDays(parseInt(e.target.value))}
                helperText="Delete articles older than this many days"
              />
            )}

            {bulkDeleteType === 'search' && (
              <TextField
                label="Search Term"
                value={search}
                disabled
                helperText="Will delete articles matching the current search"
              />
            )}

            <Alert severity="warning">
              This action cannot be undone. Are you sure you want to proceed?
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBulkDeleteDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleBulkDelete}
            disabled={bulkDeleteMutation.isLoading}
          >
            {bulkDeleteMutation.isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Alerts */}
      {(deleteMutation.error || analyzeMutation.error || bulkDeleteMutation.error) && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {deleteMutation.error && 'Failed to delete article. '}
          {analyzeMutation.error && 'Failed to analyze article. '}
          {bulkDeleteMutation.error && 'Failed to bulk delete articles. '}
          Please try again.
        </Alert>
      )}

      {/* Success Alerts */}
      {bulkDeleteMutation.isSuccess && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Successfully deleted {bulkDeleteMutation.data?.deletedCount} articles.
        </Alert>
      )}

      {analyzeMutation.isSuccess && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Article analysis started successfully! Check the jobs page for progress.
        </Alert>
      )}
    </Box>
  );
};

export default Articles;
