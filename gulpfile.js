const gulp = require('gulp');
const concat = require('gulp-concat');
const inject = require('gulp-inject-string');
const uglify = require('gulp-uglify-es').default;
const mode = require('gulp-mode')();
const sourcemaps = require('gulp-sourcemaps');
const bump = require('gulp-bump');
const git = require('gulp-git');
const cleanCSS = require('gulp-clean-css');
const imagemin = require('gulp-imagemin');

const jsfiles = {
  events: './static/js/copyPasteEvents.js',
  linkBoxes: './static/js/linkBoxes.js',
  linkIcons: './static/js/linkIcons.js',
  linkL10n: './static/js/linkL10n.js',
  newLink: './static/js/newLink.js',
  preLinkMark: './static/js/preLinkMark.js',
  timeFormat: './static/js/timeFormat.js',
  shared: './static/js/shared.js',
};

const jsPlugins = []

// var randomString = require('ep_etherpad-lite/static/js/pad_utils').randomString;
// var _ = require('ep_etherpad-lite/static/js/underscore');
const etherpadModule = [`
	const randomString = require('ep_etherpad-lite/static/js/pad_utils').randomString;
	const _ = require('ep_etherpad-lite/static/js/underscore');
`]

const cssFiles = ['./static/css/**/*.css']
const imageFiles = ['./static/img/*']

const gulpifyJs = () => gulp.src([
	...jsPlugins,
	...Object.entries(jsfiles).map((x) => x[1])
])
    // .pipe(mode.production(sourcemaps.init()))
		.pipe(concat('ep.full.hyperlinks.mini.js'))
		.pipe(inject.prepend(`${etherpadModule} \n`))
    .pipe(inject.append(`return {\n${Object.entries(jsfiles).map((x) => `${x[0]}\n`)}}\n`))
    .pipe(inject.wrap('exports.moduleList = (()=>{\n', '})();'))
    // .pipe(mode.production(uglify(/* options */)))
    // .pipe(mode.production(sourcemaps.write('.')))
    .pipe(gulp.dest('./static/dist/js'));

gulp.task('js', gulpifyJs);

gulp.task('minify-css', () => {
  return gulp.src('static/css/**/*.css')
    .pipe(cleanCSS({compatibility: 'ie8'}))
    .pipe(gulp.dest('static/dist/css'));
});

gulp.task('watch', () => {
	const watchFiles = [
		...Object.entries(jsfiles).map((x) => x[1]),
		...cssFiles
	]
  gulp.watch(watchFiles, gulp.series(['js', 'minify-css']));
});