module.exports = {
  singleQuote: true,
  trailingComma: "all",
  semi: true,
  printWidth: 100,
  tabWidth: 4,
  useTabs: false,
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: "avoid",
  endOfLine: "lf",
  overrides: [
    {
      files: ['*.json', 'package.json'],
      options: {
        parser: 'json-stringify', // 保持 key 排序 & 双引号
        tabWidth: 2,
        trailingComma: 'none',
      },
    },
  ],
};
