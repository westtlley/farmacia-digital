export default {
  test: {
    root: '.',
    environment: 'node',
    include: ['tests/**/*.test.js'],
    clearMocks: true,
    restoreMocks: true,
    pool: 'threads',
    fileParallelism: false,
  },
};
