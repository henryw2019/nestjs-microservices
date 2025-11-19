export default (options, webpack) => {
  const lazyImports = [
    '@nestjs/microservices',
    '@nestjs/websockets',
    'cache-manager',
    'class-validator',
    'class-transformer',
    '@grpc/grpc-js',
    '@grpc/proto-loader',
    '@prisma/client',
  ];

  return {
    ...options,
    externals: [],
    plugins: [
      ...options.plugins,
      new webpack.IgnorePlugin({
        checkResource(resource) {
          return lazyImports.includes(resource);
        },
      }),
    ],
    module: {
      ...options.module,
      rules: [
        {
          test: /\.tsx?$/,
          exclude: [/node_modules/, /prisma-client/],
          use: {
            loader: 'swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  decorators: true,
                  dynamicImport: true,
                },
                transform: {
                  legacyDecorator: true,
                  decoratorMetadata: true,
                },
                target: 'es2022',
                loose: false,
                externalHelpers: true,
                keepClassNames: true,
              },
              module: {
                type: 'commonjs',
                strict: true,
                strictMode: true,
                lazy: false,
              },
              sourceMaps: true,
              inlineSourcesContent: true,
            },
          },
        },
      ],
    },
  };
};