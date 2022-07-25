const gulp = require('gulp');
const concat = require('gulp-concat');
const bump = require('gulp-bump');
const git = require('gulp-git');
const cleanCSS = require('gulp-clean-css');
const imagemin = require('gulp-imagemin');
const exec = require('child_process').exec;

const cssFiles = ['./static/css/**/*.css'];
const imageFiles = ['./static/img/*'];
const js = ['./static/js/**/*.js'];

gulp.task('minify-css', () => gulp.src('static/css/**/*.css')
    .pipe(cleanCSS({compatibility: 'ie8'}))
    .pipe(concat('bundle.min.css'))
    .pipe(gulp.dest('static/dist')));

gulp.task('minify-image', () => gulp.src(imageFiles)
    .pipe(imagemin())
    .pipe(gulp.dest('static/dist/img')));

gulp.task('bump', () => gulp.src('./package.json')
    .pipe(bump({type: 'minor'}))
    .pipe(gulp.dest('./')));

gulp.task('git:publish', () => gulp.src([
  './static/dist/',
  './package.json',
]).pipe(git.add())
    .pipe(git.commit('build, version')));

gulp.task('git:push', (cb) => {
  git.push('origin', (err) => {
    if (err) throw err;
    cb();
  });
});

gulp.task('watch', (cb) => {
  const watchFiles = [
    ...cssFiles,
    ...imageFiles,
    ...js,
  ];

  gulp.watch(watchFiles, gulp.series(['minify-css', 'rollup-build']));
});

gulp.task('rollup-build', (cb) => {
  exec('npm run rollup:build', (err, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

gulp.task('build', gulp.series([
  'rollup-build',
  'minify-css',
  'minify-image',
  'bump',
  'git:publish',
  'git:push',
]));
