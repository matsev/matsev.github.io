---
title: Talks
permalink: /talks/
toc: true
---

Below are some of the public events that I have presented at


{% for talk in site.data.talks %}
<!-- {{ talk }} -->
  
## {{ talk.event }} {{ talk.year }}

{{ talk.title }}

{{ talk.day }} {{ talk.location }}

{% if talk.co-presenter %}
co-presenter: {{ talk.co-presenter }}
{% endif %}
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

{% if talk.slideshare and talk.youtube or talk.vimeo %}
[[slides]({{ talk.slides }})]
{%- endif -%}
{%- if talk.website -%}
[[website]({{ talk.website }})]
{% endif %}

{% endfor %}