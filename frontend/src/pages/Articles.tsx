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
  useTheme,
  useMediaQuery,
  Collapse,
  CardHeader,
  Avatar,
  CardMedia,
  Fade,
  Zoom,
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
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  RssFeed as FeedIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { format } from 'date-fns';
import { articlesApi, analysisApi, feedsApi } from '../services/api';
import { Article, Feed } from '../types';

const Articles: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  // Get saved limit from localStorage or default to 12
  const getSavedLimit = () => {
    const saved = localStorage.getItem('articlesPerPage');
    return saved ? parseInt(saved) : (isMobile ? 6 : 12);
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
  const [showFilters, setShowFilters] = useState(!isMobile);
  
  // Enhanced filtering options
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customDateRange, setCustomDateRange] = useState<{start: string, end: string}>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [authorFilter, setAuthorFilter] = useState('');
  const [hasAnalysis, setHasAnalysis] = useState<'all' | 'yes' | 'no'>('all');
  const [sortBy, setSortBy] = useState<'published' | 'title' | 'feed' | 'author'>('published');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
    setDateFilter('all');
    setCustomDateRange({
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    });
    setAuthorFilter('');
    setHasAnalysis('all');
    setSortBy('published');
    setSortOrder('desc');
    setPage(1);
  };

  // Enhanced filter handlers
  const handleDateFilterChange = (event: any) => {
    setDateFilter(event.target.value);
    setPage(1);
  };

  const handleCustomDateChange = (field: 'start' | 'end') => (event: any) => {
    setCustomDateRange(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setPage(1);
  };

  const handleAuthorFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAuthorFilter(event.target.value);
    setPage(1);
  };

  const handleAnalysisFilterChange = (event: any) => {
    setHasAnalysis(event.target.value);
    setPage(1);
  };

  const handleSortChange = (event: any) => {
    setSortBy(event.target.value);
    setPage(1);
  };

  const handleSortOrderChange = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    setPage(1);
  };

  const isAllSelected = articlesData?.articles?.length > 0 && 
    articlesData.articles.every(article => selectedArticles.has(article.id!));

  const isSomeSelected = articlesData?.articles?.some(article => selectedArticles.has(article.id!));

  // Helper function to truncate text
  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Get grid sizes based on screen size
  const getGridSize = () => {
    if (isMobile) return 12;
    if (isTablet) return 6;
    if (isDesktop) return 4;
    return 3;
  };

  return (
    <Box sx={{ minHeight: '100vh', pb: 4 }}>
      {/* Minimalist Header */}
      <Paper 
        sx={{ 
          p: { xs: 2, sm: 3 }, 
          mb: 3,
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.shadows[1],
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            bgcolor: 'primary.main',
          }
        }}
      >
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between', 
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: { xs: 2, sm: 0 }
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography 
                variant={isMobile ? "h5" : "h4"}
                sx={{ 
                  fontWeight: 600,
                  color: 'text.primary'
                }}
              >
                Articles
              </Typography>
              {selectedArticles.size > 0 && (
                <Badge badgeContent={selectedArticles.size} color="error">
                  <Chip 
                    label={`${selectedArticles.size} Selected`} 
                    color="error" 
                    variant="filled"
                    size={isMobile ? "small" : "medium"}
                    sx={{ 
                      fontWeight: 500
                    }}
                  />
                </Badge>
              )}
            </Box>
            {articlesData?.pagination && (
              <Typography 
                variant="body2" 
                sx={{ 
                  mt: 0.5,
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  color: 'text.secondary'
                }}
              >
                {limit === -1 
                  ? `Showing all ${articlesData.pagination.total} articles`
                  : `Showing ${offset + 1}-${Math.min(offset + limit, articlesData.pagination.total)} of ${articlesData.pagination.total} articles`
                }
              </Typography>
            )}
          </Box>
          
          <Box 
            display="flex" 
            alignItems="center" 
            gap={1.5}
            sx={{ 
              flexDirection: { xs: 'row', sm: 'row' },
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            {/* Minimalist Refresh Button */}
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => queryClient.invalidateQueries('articles')}
              size={isMobile ? "small" : "medium"}
              sx={{ 
                minWidth: { xs: 'auto', sm: 'auto' },
                px: { xs: 2, sm: 3 },
                py: { xs: 1, sm: 1.5 },
                borderRadius: 2,
                fontWeight: 500,
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: theme.shadows[2],
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              Refresh
            </Button>
            
            {/* Mobile Filters Toggle */}
            {isMobile && (
              <Button
                variant="outlined"
                startIcon={showFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => setShowFilters(!showFilters)}
                size="small"
                sx={{ 
                  borderRadius: 2
                }}
              >
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Minimalist Search, Filter and Refresh Bar */}
      <Collapse in={showFilters}>
        <Paper 
          sx={{ 
            p: { xs: 2, sm: 3 }, 
            mb: 3,
            borderRadius: 2,
            boxShadow: theme.shadows[1],
            bgcolor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              bgcolor: 'primary.main',
            }
          }}
        >
          {/* Section Header */}
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              mb: { xs: 2, sm: 3 },
              pb: 1,
              borderBottom: `1px solid ${theme.palette.divider}`
            }}
          >
            <FilterIcon sx={{ color: 'primary.main', fontSize: '1.1rem' }} />
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 500, 
                color: 'text.primary',
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              Search & Filters
            </Typography>
            <Chip 
              label={`${articlesData?.pagination?.total || 0} articles`} 
              size="small" 
              variant="outlined"
              sx={{ 
                ml: 'auto',
                fontSize: '0.75rem'
              }}
            />
          </Box>

                     <Box 
             sx={{ 
               display: 'grid',
               gridTemplateColumns: { 
                 xs: '1fr', 
                 sm: 'repeat(auto-fit, minmax(200px, 1fr))',
                 md: 'repeat(auto-fit, minmax(180px, 1fr))'
               },
               gap: { xs: 2, sm: 2.5 },
               alignItems: 'start'
             }}
           >
                                       {/* Minimalist Search Field */}
              <Box sx={{ gridColumn: { xs: '1', sm: 'span 2', md: 'span 1' } }}>
                <TextField
                  placeholder="Search articles..."
                  value={search}
                  onChange={handleSearch}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                        <SearchIcon sx={{ color: 'text.secondary', fontSize: '1rem' }} />
                      </Box>
                    ),
                    endAdornment: search && (
                      <IconButton
                        size="small"
                        onClick={() => setSearch('')}
                        sx={{ mr: -0.5 }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    ),
                  }}
                  size="small"
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1,
                      '&:hover': {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main',
                        },
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main',
                        borderWidth: 1,
                      },
                    },
                  }}
                />
                {search && (
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, ml: 1, display: 'block' }}>
                    Searching for: "{search}"
                  </Typography>
                )}
              </Box>
            
                                       {/* Minimalist Feed Filter */}
              <FormControl 
                size="small" 
                sx={{ 
                  width: '100%'
                }}
              >
               <InputLabel>Feed Source</InputLabel>
               <Select
                 value={selectedFeedId}
                 label="Feed Source"
                 onChange={handleFeedFilter}
                 startAdornment={
                   <FeedIcon sx={{ mr: 1, color: 'text.secondary', fontSize: '0.9rem' }} />
                 }
                 sx={{
                   borderRadius: 1,
                   '& .MuiSelect-select': {
                     display: 'flex',
                     alignItems: 'center',
                   },
                 }}
               >
                 <MenuItem value="">
                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                     <FeedIcon fontSize="small" />
                     <Typography>All Feeds</Typography>
                   </Box>
                 </MenuItem>
                 {feeds?.map((feed) => (
                   <MenuItem key={feed.id} value={feed.id}>
                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                       <FeedIcon fontSize="small" />
                       <Typography>{feed.title}</Typography>
                     </Box>
                   </MenuItem>
                 ))}
               </Select>
             </FormControl>

                           {/* Enhanced Date Filter */}
              <FormControl 
                size="small" 
                sx={{ 
                  width: '100%'
                }}
              >
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={dateFilter}
                  label="Date Range"
                  onChange={handleDateFilterChange}
                  sx={{ borderRadius: 1 }}
                >
                  <MenuItem value="all">All Time</MenuItem>
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="week">This Week</MenuItem>
                  <MenuItem value="month">This Month</MenuItem>
                  <MenuItem value="custom">Custom Range</MenuItem>
                </Select>
              </FormControl>

              {/* Custom Date Range */}
              {dateFilter === 'custom' && (
                <Box sx={{ 
                  gridColumn: { xs: '1', sm: 'span 2' },
                  display: 'flex',
                  gap: 1
                }}>
                  <TextField
                    type="date"
                    value={customDateRange.start}
                    onChange={handleCustomDateChange('start')}
                    size="small"
                    sx={{ borderRadius: 1, flex: 1 }}
                  />
                  <TextField
                    type="date"
                    value={customDateRange.end}
                    onChange={handleCustomDateChange('end')}
                    size="small"
                    sx={{ borderRadius: 1, flex: 1 }}
                  />
                </Box>
              )}

              {/* Author Filter */}
              <TextField
                placeholder="Filter by author..."
                value={authorFilter}
                onChange={handleAuthorFilterChange}
                size="small"
                fullWidth
                sx={{ 
                  '& .MuiOutlinedInput-root': { borderRadius: 1 }
                }}
              />

              {/* Analysis Filter */}
              <FormControl 
                size="small" 
                sx={{ 
                  width: '100%'
                }}
              >
                <InputLabel>Analysis</InputLabel>
                <Select
                  value={hasAnalysis}
                  label="Analysis"
                  onChange={handleAnalysisFilterChange}
                  sx={{ borderRadius: 1 }}
                >
                  <MenuItem value="all">All Articles</MenuItem>
                  <MenuItem value="yes">With Analysis</MenuItem>
                  <MenuItem value="no">Without Analysis</MenuItem>
                </Select>
              </FormControl>

              {/* Sort Options */}
              <FormControl 
                size="small" 
                sx={{ 
                  width: '100%'
                }}
              >
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  label="Sort By"
                  onChange={handleSortChange}
                  sx={{ borderRadius: 1 }}
                >
                  <MenuItem value="published">Published Date</MenuItem>
                  <MenuItem value="title">Title</MenuItem>
                  <MenuItem value="feed">Feed Source</MenuItem>
                  <MenuItem value="author">Author</MenuItem>
                </Select>
              </FormControl>

              {/* Sort Order Toggle */}
              <Button
                variant="outlined"
                onClick={handleSortOrderChange}
                size="small"
                fullWidth
                sx={{ 
                  borderRadius: 1,
                  px: 2
                }}
              >
                {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
              </Button>

              {/* Minimalist Per Page Selector */}
              <FormControl 
                size="small" 
                sx={{ 
                  width: '100%'
                }}
              >
                <InputLabel>Per Page</InputLabel>
                <Select
                  value={limit}
                  label="Per Page"
                  onChange={handleLimitChange}
                  startAdornment={
                    <Box sx={{ mr: 1, color: 'text.secondary' }}>
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        {limit === -1 ? '∞' : limit}
                      </Typography>
                    </Box>
                  }
                  sx={{
                    borderRadius: 1,
                    '& .MuiSelect-select': {
                      display: 'flex',
                      alignItems: 'center',
                    },
                  }}
                >
                  <MenuItem value={6}>6 articles</MenuItem>
                  <MenuItem value={12}>12 articles</MenuItem>
                  <MenuItem value={24}>24 articles</MenuItem>
                  <MenuItem value={50}>50 articles</MenuItem>
                  <MenuItem value={100}>100 articles</MenuItem>
                  <MenuItem value={-1}>Show All</MenuItem>
                </Select>
              </FormControl>

                                       {/* Minimalist Action Buttons */}
              <Box sx={{ 
                gridColumn: { xs: '1', sm: 'span 2' },
                display: 'flex',
                gap: 1,
                flexDirection: { xs: 'column', sm: 'row' }
              }}>
                {/* Clear Filters Button */}
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={handleClearFilters}
                  size="small"
                  sx={{ 
                    flex: { xs: '1', sm: '0 0 auto' },
                    borderRadius: 1,
                    px: { xs: 2, sm: 2.5 }
                  }}
                >
                  Clear All
                </Button>

                {/* Bulk Delete Button */}
                {selectedArticles.size > 0 && (
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<BulkDeleteIcon />}
                    onClick={() => setOpenBulkDeleteDialog(true)}
                    size="small"
                    sx={{ 
                      flex: { xs: '1', sm: '0 0 auto' },
                      borderRadius: 1,
                      px: { xs: 2, sm: 2.5 },
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: theme.shadows[2],
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    Delete {selectedArticles.size} Selected
                  </Button>
                )}
              </Box>
            </Box>

          {/* Quick Stats */}
          {articlesData?.pagination && (
            <Box 
              sx={{ 
                mt: 2, 
                pt: 2, 
                borderTop: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1
              }}
            >
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip 
                  label={`Page ${page} of ${Math.ceil(articlesData.pagination.total / limit)}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
                <Chip 
                  label={`${limit === -1 ? 'All' : limit} per page`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
                {selectedFeedId && (
                  <Chip 
                    label={`Filtered by feed`}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                )}
              </Box>
              
              <Typography variant="caption" color="textSecondary">
                Last updated: {new Date().toLocaleTimeString()}
              </Typography>
            </Box>
          )}
        </Paper>
      </Collapse>

      {/* Select All Checkbox */}
      {articlesData?.articles && articlesData.articles.length > 0 && limit !== -1 && (
        <Box 
          mb={2}
          sx={{ 
            display: 'flex',
            justifyContent: { xs: 'center', sm: 'flex-start' }
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={isAllSelected}
                indeterminate={isSomeSelected && !isAllSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                size={isMobile ? "small" : "medium"}
              />
            }
            label={`Select All (${selectedArticles.size} selected)`}
            sx={{ 
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          />
        </Box>
      )}

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Articles Grid */}
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {articlesData?.articles?.map((article, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={article.id}>
            <Zoom in={true} style={{ transitionDelay: `${index * 100}ms` }}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[8],
                  },
                  borderRadius: 2,
                  overflow: 'hidden'
                }}
              >
                {/* Card Header with Feed Info */}
                <CardHeader
                  avatar={
                    <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                      <FeedIcon fontSize="small" />
                    </Avatar>
                  }
                  title={
                    <Typography 
                      variant="caption" 
                      color="textSecondary"
                      sx={{ 
                        fontWeight: 500,
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {article.feed_title}
                    </Typography>
                  }
                  subheader={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <ScheduleIcon fontSize="small" sx={{ fontSize: '0.75rem' }} />
                      <Typography variant="caption" color="textSecondary">
                        {format(new Date(article.published_at || ''), 'MMM dd, yyyy')}
                      </Typography>
                    </Box>
                  }
                  action={
                    <Checkbox
                      checked={selectedArticles.has(article.id!)}
                      onChange={(e) => handleSelectArticle(article.id!, e.target.checked)}
                      size="small"
                      sx={{ mr: -1 }}
                    />
                  }
                  sx={{ 
                    pb: 1,
                    '& .MuiCardHeader-content': {
                      minWidth: 0
                    }
                  }}
                />

                <CardContent sx={{ flex: 1, pt: 0, pb: 2 }}>
                  {/* Article Title */}
                  <Typography 
                    variant="h6" 
                    gutterBottom 
                    sx={{ 
                      fontWeight: 600,
                      lineHeight: 1.3,
                      mb: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      minHeight: '3.9em'
                    }}
                  >
                    {article.title}
                  </Typography>

                  {/* Article Summary */}
                  {article.summary && (
                    <Typography 
                      variant="body2" 
                      color="textSecondary"
                      sx={{ 
                        mb: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.4,
                        minHeight: '4.2em'
                      }}
                    >
                      {truncateText(article.summary, 150)}
                    </Typography>
                  )}

                  {/* Author and Tags */}
                  <Box sx={{ mb: 2 }}>
                    {article.author && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                        <PersonIcon fontSize="small" sx={{ fontSize: '0.75rem', color: 'text.secondary' }} />
                        <Typography variant="caption" color="textSecondary">
                          {truncateText(article.author, 30)}
                        </Typography>
                      </Box>
                    )}
                    
                    {/* Tags or Categories could go here */}
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {article.feed_title && (
                        <Chip 
                          label={truncateText(article.feed_title, 20)} 
                          size="small" 
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  </Box>
                </CardContent>

                {/* Card Actions */}
                <CardActions 
                  sx={{ 
                    pt: 0, 
                    pb: 2, 
                    px: 2,
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Analyze with AI">
                      <IconButton
                        size="small"
                        onClick={() => handleAnalyze(article.id!)}
                        disabled={analyzeMutation.isLoading}
                        color={analyzeMutation.isLoading ? "primary" : "default"}
                        sx={{ 
                          bgcolor: 'primary.light',
                          color: 'white',
                          '&:hover': {
                            bgcolor: 'primary.main',
                          },
                          '&:disabled': {
                            bgcolor: 'primary.light',
                            color: 'white',
                          }
                        }}
                      >
                        {analyzeMutation.isLoading ? (
                          <Box sx={{ width: 16, height: 16 }}>
                            <CircularProgress size={16} color="inherit" />
                          </Box>
                        ) : (
                          <AnalysisIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenArticle(article)}
                        sx={{ 
                          bgcolor: 'secondary.light',
                          color: 'white',
                          '&:hover': {
                            bgcolor: 'secondary.main',
                          }
                        }}
                      >
                        <OpenIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Tooltip title="Delete Article">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(article.id!)}
                      sx={{ 
                        bgcolor: 'error.light',
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'error.main',
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Zoom>
          </Grid>
        ))}
      </Grid>

      {/* Empty State */}
      {articlesData?.articles?.length === 0 && !isLoading && (
        <Paper 
          sx={{ 
            p: { xs: 3, sm: 4 }, 
            textAlign: 'center',
            borderRadius: 2,
            bgcolor: 'grey.50'
          }}
        >
          <Typography 
            variant={isMobile ? "h6" : "h5"} 
            color="textSecondary" 
            gutterBottom
          >
            No articles found
          </Typography>
          <Typography 
            variant="body2" 
            color="textSecondary"
            sx={{ maxWidth: 400, mx: 'auto' }}
          >
            {search || selectedFeedId ? 'Try adjusting your filters' : 'Articles will appear here once RSS feeds are fetched'}
          </Typography>
        </Paper>
      )}

      {/* Pagination */}
      {articlesData?.pagination && limit !== -1 && articlesData.pagination.total > limit && (
        <Box 
          display="flex" 
          flexDirection={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between" 
          alignItems="center" 
          mt={4}
          gap={2}
        >
          <Typography 
            variant="body2" 
            color="textSecondary"
            sx={{ order: { xs: 2, sm: 1 } }}
          >
            Page {page} of {Math.ceil(articlesData.pagination.total / limit)}
          </Typography>
          
          <Pagination
            count={Math.ceil(articlesData.pagination.total / limit)}
            page={page}
            onChange={handlePageChange}
            color="primary"
            size={isMobile ? "small" : "medium"}
            sx={{ order: { xs: 1, sm: 2 } }}
          />
          
          <Typography 
            variant="body2" 
            color="textSecondary"
            sx={{ order: { xs: 3, sm: 3 } }}
          >
            {articlesData.pagination.total} total articles
          </Typography>
        </Box>
      )}

      {/* Article Detail Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="lg" 
        fullWidth
        fullScreen={isMobile}
        TransitionComponent={Fade}
        transitionDuration={300}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography 
              variant={isMobile ? "h6" : "h5"} 
              sx={{ 
                flex: 1, 
                pr: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {selectedArticle?.title}
            </Typography>
            {selectedArticle && (
              <Button
                variant="contained"
                startIcon={<AnalysisIcon />}
                onClick={() => handleAnalyze(selectedArticle.id!)}
                disabled={analyzeMutation.isLoading}
                size="small"
                sx={{ 
                  minWidth: 'auto',
                  flexShrink: 0
                }}
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
                                 {/* Enhanced Article Header with Media */}
                 <Box sx={{ mb: 3 }}>
                   {/* Media Cover Image */}
                   {selectedArticle.raw_json && (() => {
                     try {
                       const rawData = JSON.parse(selectedArticle.raw_json);
                       const mediaUrl = rawData.enclosure?.url || rawData.image?.url || rawData.media?.content?.[0]?.url ||
                       rawData["media:content"]?.[0]?.["$"]?.url;
                       
                       if (mediaUrl) {
                         return (
                           <Box sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', boxShadow: theme.shadows[2] }}>
                             <CardMedia
                               component="img"
                               image={mediaUrl}
                               alt="Article cover"
                               sx={{ 
                                 width: '100%', 
                                 height: { xs: 200, sm: 300, md: 400 },
                                 objectFit: 'cover'
                               }}
                               onError={(e) => {
                                 e.currentTarget.style.display = 'none';
                               }}
                             />
                           </Box>
                         );
                       }
                       return null;
                     } catch {
                       return null;
                     }
                   })()}

                   {/* Article Metadata */}
                   <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                       <FeedIcon fontSize="small" color="primary" />
                       <Typography variant="body2" color="textSecondary">
                         {selectedArticle.feed_title} • {format(new Date(selectedArticle.published_at || ''), 'MMM dd, yyyy HH:mm')}
                       </Typography>
                     </Box>
                     {selectedArticle.author && (
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                         <PersonIcon fontSize="small" color="primary" />
                         <Typography variant="body2" color="textSecondary">
                           By: {selectedArticle.author}
                         </Typography>
                       </Box>
                     )}
                     <Button
                       variant="contained"
                       href={selectedArticle.link}
                       target="_blank"
                       startIcon={<OpenIcon />}
                       size="small"
                       sx={{ mt: 1 }}
                     >
                       Read Original Article
                     </Button>
                   </Paper>
                 </Box>

                {/* Article Content */}
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom>
                    Content
                  </Typography>
                  <Typography variant="body1" paragraph sx={{ fontWeight: 500 }}>
                    {selectedArticle.summary}
                  </Typography>

                </Box>

                                 {/* Enhanced AI Analysis Results */}
                 {articleDetails?.insights && articleDetails.insights.length > 0 && (
                   <Box>
                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                       <AnalysisIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                       <Typography variant="h6" sx={{ fontWeight: 600 }}>
                         AI Analysis Results
                       </Typography>
                       <Chip 
                         label={`${articleDetails.insights.length} insight${articleDetails.insights.length > 1 ? 's' : ''}`}
                         color="primary"
                         variant="outlined"
                         size="small"
                       />
                     </Box>
                     
                     {articleDetails.insights.map((insight: any, index: number) => (
                       <Paper 
                         key={index} 
                         sx={{ 
                           p: 3, 
                           mb: 3, 
                           borderRadius: 2,
                           border: `1px solid ${theme.palette.divider}`,
                           '&:hover': {
                             boxShadow: theme.shadows[4],
                             transform: 'translateY(-2px)',
                           },
                           transition: 'all 0.3s ease-in-out',
                           position: 'relative',
                           '&::before': {
                             content: '""',
                             position: 'absolute',
                             top: 0,
                             left: 0,
                             width: '4px',
                             height: '100%',
                             bgcolor: 'primary.main',
                             borderRadius: '2px 0 0 2px',
                           }
                         }}
                       >
                         <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                           <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                             <Chip 
                               label={insight.agent === 'sports_specialist' ? '🏈 Sports Specialist' : `🤖 ${insight.agent}`}
                               color="primary" 
                               size="medium"
                               sx={{ fontWeight: 600 }}
                             />
                             <Chip 
                               label={`${Math.round((insight.score || 0) * 100)}% confidence`}
                               color="secondary"
                               variant="outlined"
                               size="small"
                             />
                           </Box>
                           <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                             {format(new Date(insight.created_at), 'MMM dd, yyyy HH:mm')}
                           </Typography>
                         </Box>
                         
                         <Typography variant="body1" paragraph sx={{ 
                           lineHeight: 1.6,
                           fontSize: '1rem',
                           color: 'text.primary'
                         }}>
                           {insight.summary}
                         </Typography>

                        {/* Tags */}
                        {insight.tags && (
                          <Box mb={2}>
                            <Typography variant="caption" color="textSecondary">Tags:</Typography>
                            <Box display="flex" gap={1} flexWrap="wrap" mt={0.5}>
                              {(() => {
                                try {
                                  const tags = JSON.parse(insight.tags || '[]');
                                  if (Array.isArray(tags)) {
                                    return tags.map((tag: string, tagIndex: number) => (
                                      <Chip key={tagIndex} label={tag} size="small" variant="outlined" />
                                    ));
                                  }
                                  return null;
                                } catch {
                                  return <Typography variant="caption" color="textSecondary">Invalid tags data</Typography>;
                                }
                              })()}
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
                                  return Object.entries(entities).map(([key, values]: [string, any]) => {
                                    if (values && Array.isArray(values) && values.length > 0) {
                                      return (
                                        <Box key={key} display="flex" gap={1} flexWrap="wrap" mb={1}>
                                          <Typography variant="caption" sx={{ minWidth: 60, textTransform: 'capitalize' }}>
                                            {key.replace('_', ' ')}:
                                          </Typography>
                                          {values.map((value: string, valueIndex: number) => (
                                            <Chip key={valueIndex} label={value} size="small" color="secondary" variant="outlined" />
                                          ))}
                                        </Box>
                                      );
                                    }
                                    return null;
                                  });
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

                                 {/* Enhanced No Analysis Message */}
                 {(!articleDetails?.insights || articleDetails.insights.length === 0) && (
                   <Paper 
                     sx={{ 
                       p: 4, 
                       textAlign: 'center', 
                       borderRadius: 2,
                       background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                       color: 'white',
                       position: 'relative',
                       overflow: 'hidden',
                       '&::before': {
                         content: '""',
                         position: 'absolute',
                         top: -50,
                         right: -50,
                         width: 100,
                         height: 100,
                         background: 'rgba(255,255,255,0.1)',
                         borderRadius: '50%',
                       },
                       '&::after': {
                         content: '""',
                         position: 'absolute',
                         bottom: -30,
                         left: -30,
                         width: 60,
                         height: 60,
                         background: 'rgba(255,255,255,0.1)',
                         borderRadius: '50%',
                       }
                     }}
                   >
                     <Box sx={{ position: 'relative', zIndex: 1 }}>
                       <Box sx={{ mb: 2 }}>
                         <AnalysisIcon sx={{ fontSize: 60, opacity: 0.8 }} />
                       </Box>
                       <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                         Ready for AI Analysis
                       </Typography>
                       <Typography variant="body2" sx={{ mb: 3, opacity: 0.9 }}>
                         This article hasn't been analyzed yet. Get instant insights about sports events, players, teams, and more.
                       </Typography>
                       
                       <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                         <Chip 
                           label="Sports Events" 
                           sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} 
                         />
                         <Chip 
                           label="Player Analysis" 
                           sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} 
                         />
                         <Chip 
                           label="Team Insights" 
                           sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} 
                         />
                         <Chip 
                           label="Match Predictions" 
                           sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} 
                         />
                       </Box>
                       
                       <Button
                         variant="contained"
                         startIcon={<AnalysisIcon />}
                         onClick={() => handleAnalyze(selectedArticle.id!)}
                         disabled={analyzeMutation.isLoading}
                         size="large"
                         sx={{ 
                           mt: 3,
                           bgcolor: 'white',
                           color: 'primary.main',
                           '&:hover': {
                             bgcolor: 'grey.100',
                           },
                           px: 4,
                           py: 1.5,
                           borderRadius: 2,
                           fontWeight: 600
                         }}
                       >
                         {analyzeMutation.isLoading ? 'Analyzing...' : 'Start AI Analysis'}
                       </Button>
                       
                       <Typography variant="caption" sx={{ display: 'block', mt: 2, opacity: 0.7 }}>
                         Analysis typically takes 1-3 minutes
                       </Typography>
                     </Box>
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
      <Dialog 
        open={openBulkDeleteDialog} 
        onClose={() => setOpenBulkDeleteDialog(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
      >
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
