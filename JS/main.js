var app = new Vue ({
    el : '#root' ,
    data : {
        userQuery : '' ,
        searchResults : []
    } , 
    methods : {
        searchMovie() {
            axios.get('https://api.themoviedb.org/3/search/movie' , { params: { api_key : "37e7aa1edd3103b63a7d7516fa1047f8" ,  query : this.userQuery } } ).then( (response) =>  {
                this.searchResults = response.data.results;
                console.log(this.searchResults);
            });

        }
    }
});