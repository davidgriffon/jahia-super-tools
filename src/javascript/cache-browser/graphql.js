import {gql} from '@apollo/client';

export const CACHE_ENTRIES = gql`
    query SuperToolsCacheEntries($page: Int!, $pageSize: Int!, $groupBy: String, $filterValue: String, $search: String) {
        admin {
            superTools {
                cache {
                    stats {
                        cacheHitCount
                        localHeapHitCount
                        localDiskHitCount
                        cacheMissCount
                        size
                        memoryStoreSize
                        diskStoreSize
                        totalSizeBytes
                    }
                    entries(page: $page, pageSize: $pageSize, groupBy: $groupBy, filterValue: $filterValue, search: $search) {
                        pagination {
                            page
                            pageSize
                            totalEntries
                            totalPages
                            hasNextPage
                            hasPreviousPage
                        }
                        entries {
                            key
                            present
                            size
                            hitCount
                            creation
                            expiration
                            lastAccess
                            timeToLive
                        }
                    }
                }
            }
        }
    }
`;

export const CACHE_GROUP_VALUES = gql`
    query SuperToolsCacheGroupValues($groupBy: String!) {
        admin {
            superTools {
                cache {
                    groupValues(groupBy: $groupBy)
                }
            }
        }
    }
`;

export const CACHE_ENTRY = gql`
    query SuperToolsCacheEntry($key: String!) {
        admin {
            superTools {
                cache {
                    entry(key: $key) {
                        key
                        present
                        size
                        hitCount
                        creation
                        expiration
                        lastAccess
                        timeToLive
                        content
                        properties {
                            name
                            value
                        }
                    }
                }
            }
        }
    }
`;

export const FLUSH_ENTRY = gql`
    mutation SuperToolsFlushCacheEntry($key: String!) {
        admin {
            superTools {
                cache {
                    flushEntry(key: $key)
                }
            }
        }
    }
`;

export const FLUSH_ALL = gql`
    mutation SuperToolsFlushCache {
        admin {
            superTools {
                cache {
                    flushAll
                }
            }
        }
    }
`;
