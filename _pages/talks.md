---
title: Talks
permalink: /talks/
toc: true
---

Below are some of the presentations I have made at public events. All content is freely available under a [Creative Commons Attribution](http://creativecommons.org/licenses/by/4.0/) license (reuse anything but please mention me) unless stated otherwise on the sites hosting the content.


{% for talk in site.data.talks %}
  
## {{ talk.event }} - {{ talk.title }} 

{{ talk.day }} {{ talk.year }}
{%- if talk.location -%}, {{ talk.location }}{%- endif -%}
{%- if talk.co-presenter -%}, co-presenter: {{ talk.co-presenter }}{% endif %}
{: .notice }

{% if talk.youtube %}
{% capture youtube_id %}{{ talk.youtube }}{% endcapture %}
{% include youtube-player.html id=youtube_id %}
{% elsif talk.vimeo %}
{% capture vimeo_id %}{{ talk.vimeo }}{% endcapture %}
{% include vimeo-player.html id=vimeo_id %}
{% elsif talk.slideshare %}
{% capture slideshare_id %}{{ talk.slideshare }}{% endcapture %}
{% include slideshare-viewer.html id=slideshare_id %}
{% endif %}

{%- if talk.website -%}
[[website]({{ talk.website }})]
{%- endif -%}
{%- if talk.slideshare and talk.youtube or talk.vimeo -%}
[[slides]({{ talk.slides }})]
{%- endif -%}

{% endfor %}