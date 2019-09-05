var MovieRama = (function(win, doc) {

	// Configuration
	var Config = {
		apiKey: 'bc50218d91157b1ba4f142ef7baaa6a0',
		baseURL: 'http://api.themoviedb.org/3/',
		imageURL: 'https://image.tmdb.org/t/p/',
		videoURL: 'https://www.youtube.com/watch?v=',
		videoThumbnailURL: 'https://img.youtube.com/vi/',
		language: 'en-US',
		timeout: 5000,
		infiniteScrollThreshold: 300
	}
	
	// Helpers
	var page = 1,
		loading = false,
		searching = false,
		activeMovieId = 0,
		genreLookup = {};

	// Attach event handlers
	win.onload = init;
	win.addEventListener('movierama:pageloaded', onPageLoaded, false);
	win.onscroll = onWindowScroll;
	
	doc.addEventListener("keyup", onSearch, false);

	// Initialize MovieRama
	function init() {
		// Populate genre lookup
		client({
			url: "genre/movie/list" + generateQuery()
		},
		function(data){
			var json = JSON.parse(data);
			
			json.genres.forEach(function(genre, i) {
				genreLookup[genre.id] = genre.name;
			});
			
			getNowPlaying({page: page}, renderMovies);
		});
	}
	
	// Private methods
	function onPageLoaded() {
		loading = false;
	}
	
	function onWindowScroll() {
		if ((win.innerHeight + win.scrollY + Config.infiniteScrollThreshold) >= doc.documentElement.scrollHeight) {
			if(!loading){
				loading = true;
				page += 1;

				if(searching)
					searchMovie({query: doc.getElementById('searchBox').value, page: page}, renderMovies);
				else
					getNowPlaying({page: page}, renderMovies);
			}
		}
	}
	
	function onSearch(ev) {
		if (ev.isComposing || ev.keyCode === 229) {
			return;
		}
		searchBox = doc.getElementById('searchBox');
		
		if(searchBox.value.length > 0)
		{
			searching = true;
			
			searchMovie({query: searchBox.value, page: page}, renderMovies);
		}
	}
	
	function generateQuery(options) {
		'use strict';
		var myOptions, query, option;

		myOptions = options || {};
		query = "?api_key=" + Config.apiKey + "&language=" + Config.language;

		if (Object.keys(myOptions).length > 0) {
		  for (option in myOptions) {
			if (myOptions.hasOwnProperty(option) && option !== "id" && option !== "body") {
			  query = query + "&" + option + "=" + myOptions[option];
			}
		  }
		}
		return query;
	}
	
	function client(options, success, error) {
		'use strict';

		var xhr = new XMLHttpRequest();
		xhr.open('GET', Config.baseURL + options.url, true);
		xhr.timeout = Config.timeout;
		xhr.onload = function(e) {
		  if (xhr.readyState === 4) {
			if (xhr.status === 200) {
			  success(xhr.responseText);
			} else {
			  error(xhr.responseText);
			}
		  } else {
			error(xhr.responseText);
		  }
		};
		xhr.onerror = function(e) {
		  error(xhr.responseText);
		};
		xhr.ontimeout = function() {
		  error('{"status_code":408,"status_message":"Request timed out"}');
		};
		xhr.send(null);
	}
	
	function getImage(options) {
		'use strict';
		return options.file ? Config.imageURL + options.size + options.file : '';
	}
	
	function renderMovies(data) {
		var movies = JSON.parse(data),
			buffer = [],
			container = document.getElementById('movies');

		if(movies.results.length > 0)
		{
			movies.results.forEach(function(movie, i) {
			  buffer.push(
				'<article id="movie-'+ movie.id +'" class="movie-card">',
					'<a href="javascript:" class="movie-link" onclick="MovieRama.showMovieDetails('+ movie.id +')">',
						'<aside class="movie-header" style="background-image: url(' + getImage({size: 'w342', file: movie.poster_path}) + ');"></aside>',
						'<div class="movie-content">',
							'<h3 class="movie-content__title">' + movie.title + '</h3>',
							movie.vote_average > 0 ? '<span class="movie-content__avg">' + movie.vote_average + '</span>' : '',
							'<ul class="movie-content__meta">',
								'<li>' + (new Date(movie.release_date)).getFullYear() + '</li>',
								'<li>' + movie.genre_ids.map(function(genreId){ return genreLookup[genreId]; }).join(', ') + '</li>',
							'</ul>',
							'<p class="movie-content__overview">' + movie.overview + '</p>',
						'</div>',
					'</a>',
					'<div class="movie-details">',
						'<nav class="movie-details__nav">',
							'<ul>',
								'<li><a href="javascript:" id="videos-'+ movie.id +'" class="dt-'+ movie.id +'" onclick="MovieRama.getVideos('+ movie.id +');">Videos</a></li>',
								'<li><a href="javascript:" id="reviews-'+ movie.id +'" class="dt-'+ movie.id +'" onclick="MovieRama.getReviews('+ movie.id +');">Reviews</a></li>',
								'<li><a href="javascript:" id="similar-'+ movie.id +'" class="dt-'+ movie.id +'" onclick="MovieRama.getSimilarMovies('+ movie.id +');">Similar</a></li>',
							'</ul>',
						'</nav>',
						'<div id="movie-details-'+ movie.id +'" class="movie-details__body">',
						'</div>',
					'</div>',
				'</article>'
			  )
			});
		
			if(page == 1)
				container.innerHTML = buffer.join('');
			else
				container.innerHTML += buffer.join('');
		}
		else if(page == 1)
			container.innerHTML = '<p><center>No movies found.</center></p>';
		
		// trigger custom event in order to resume onscroll handling
		win.dispatchEvent(new CustomEvent('movierama:pageloaded'));
	}
	
	function renderVideos(data) {
		var videos = JSON.parse(data),
			buffer = [];

		if(videos.results.length > 0)
		{
			buffer.push('<ul>');
			
			videos.results.forEach(function(video, i) {
			  buffer.push(
				'<li>',
					'<a href="'+ Config.videoURL + video.key + '" target="_blank">',
						'<img src="' + Config.videoThumbnailURL + video.key + '/0.jpg" />'+ video.name,
					'</a>',
				'</li>'
			  );
			});
			
			buffer.push('</ul>');
		}
		else
			buffer.push('<p><center>No videos found.</center></p>');
			
		return buffer.join('');
	}
	
	function renderReviews(data) {
		var reviews = JSON.parse(data),
			buffer = [];

		if(reviews.results.length > 0)
		{
			buffer.push('<ul>');

			reviews.results.forEach(function(review, i) {
			  buffer.push(
				'<li>',
					'<blockquote>',
						'<p>' + review.content + '</p>',
						'<cite>',
							'<a href="' + review.url + '" target="_blank">' + review.author + '</a>',
						'</cite>',
					'</blockquote>',
				'</li>'
			  );
			});
			
			buffer.push('</ul>');
		}
		else
			buffer.push('<p><center>No reviews found.</center></p>');
			
		return buffer.join('');
	}
	
	function renderSimilarMovies(data) {
		var similars = JSON.parse(data),
			buffer = [];
		
		if(similars.results.length > 0)
		{
			buffer.push('<ul>');

			similars.results.forEach(function(similar, i) {
			  buffer.push(
				'<li>',
					'<img src="'+ getImage({size: 'w342', file: similar.poster_path}) +'" />'+ similar.title,
				'</li>'
			  );
			});
			
			buffer.push('</ul>');
		}
		else
			buffer.push('<p><center>No similar movies found.</center></p>');
		
			
		return buffer.join('');
	}
	
	function getNowPlaying(options, success, error) {
		'use strict';
		
		client({
				url: "movie/now_playing" + generateQuery(options)
			},
			success,
			error
		);
	}
	
	function searchMovie(options, success, error) {
		'use strict';

		client({
			url: "search/movie" + generateQuery(options)
		  },
		  success,
		  error
		);
	}
	
	// Public methods
	function getVideos(movieId, callback) {
		'use strict';

		client({
			url: "movie/" + movieId + "/videos" + generateQuery({id: movieId})
		},
		function(data){
			doc.getElementById('movie-details-' + movieId).innerHTML = renderVideos(data);
			toggleClass(movieId);
			doc.getElementById('videos-' + movieId).classList.add('md--active');
			
			if(typeof callback == 'function')
				callback();
		});
	}
	
	function getReviews(movieId) {
		'use strict';

		client({
			url: "movie/" + movieId + "/reviews" + generateQuery({id: movieId})
		},
		function(data){
			doc.getElementById('movie-details-' + movieId).innerHTML = renderReviews(data);
			toggleClass(movieId);
			doc.getElementById('reviews-' + movieId).classList.add('md--active');
		});
	}
	
	function getSimilarMovies(movieId) {
		'use strict';

		client({
			url: "movie/" + movieId + "/similar" + generateQuery({id: movieId})
		},
		function(data){
			doc.getElementById('movie-details-' + movieId).innerHTML = renderSimilarMovies(data);
			toggleClass(movieId);
			doc.getElementById('similar-' + movieId).classList.add('md--active');
		});
	}
	
	function showMovieDetails(movieId) {
		var activeMovie = doc.getElementsByClassName('mc--active');
		
		if(activeMovieId > 0 && activeMovieId == movieId)
		{
			activeMovie[0].classList.remove('mc--active');
			activeMovieId = 0;
			return;
		}
		
		if(activeMovie.length > 0)
			activeMovie[0].classList.remove('mc--active');
		
		activeMovieId = movieId;
		
		// load videos by default
		getVideos(movieId, function(){
			//toggleClass(movieId);
			doc.getElementById('movie-' + movieId).classList.add('mc--active');
		});
	}
	
	function toggleClass(movieId) {
		var links = document.getElementsByClassName('dt-' + movieId + ' md--active');

		if(links.length > 0)
			links[0].classList.remove('md--active');
	}
	
	function resetSearch() {
		searching = false;
		page = 1;
		
		getNowPlaying({page: page}, renderMovies);
	}
	
	// MovieRama API
	return {
		getVideos: getVideos
		,getReviews: getReviews
		,getSimilarMovies: getSimilarMovies
		,showMovieDetails: showMovieDetails
		,resetSearch: resetSearch
	};

})(window, document);