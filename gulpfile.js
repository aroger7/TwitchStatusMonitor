var gulp = require('gulp');
var sass = require('gulp-sass');
var moduleImporter = require('sass-module-importer');
var browserSync = require('browser-sync').create();
var reload = browserSync.reload;

gulp.task('serve', () => {
    browserSync.init({
        server: './'
    });

    gulp.watch("sass/**/*.scss").on('change', function () {
        console.log("Compiling SASS...");
        gulp.src('sass/main.scss')
            .pipe(sass({
                importer: moduleImporter()
            }).on('error', sass.logError))
            .pipe(gulp.dest('./css/'));
        reload();
    });

    gulp.watch('index.html').on('change', reload);
    gulp.watch('js/index.js').on('change', reload);
})
