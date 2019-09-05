# Are We Triaged Yet

Triage stats for Nightly and Beta. Deployed on https://are-we-triaged-yet.herokuapp.com/

Use `npm initialize` and `npm run` to start and make a note of the URL returned in the console. 

## Query string arguments

* **version**: numeric version of Firefox nightly or beta
* **report**: `untriaged`, `affecting`, `to_uplift`, `uplifted`, `fix_or_defer`
* **all**: by default, the top 10 components are listed in each section, adding `all` to the query string will list all components

Multiple vreports can be specified as comma separated values, ie `?report=untriaged,uplifted&all`.
