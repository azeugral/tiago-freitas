/* Tiago Freitas — hero "ponto a ponto".
   A mandala dele (gémeo, reconstruída em 10 divisões a partir da tatuagem) nasce na folha:
   guias a compasso (lápis) -> o traço das linhas de pele, do centro para fora em todas as divisões ao mesmo tempo ->
   o pontilhado de agulha fecha a peça, escuros primeiro -> o lápis é apagado. Peça completa em 1,6 s.
   mandalaHero(canvas, img) -> { ok, quadro(t) } ; mandalaCiclo = duração do ciclo */
(function () {
  const VS = `#version 300 es
  layout(location=0) in vec2 p; out vec2 uv;
  void main(){ uv = p*.5+.5; uv.y = 1.-uv.y; gl_Position = vec4(p,0.,1.); }`;
  const FS = `#version 300 es
  precision highp float;
  in vec2 uv; out vec4 o;
  uniform sampler2D uT; uniform float uTm, uPx;
  const float PI = 3.14159265, N = 10.;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float anel(float r, float R, float w){ float d = abs(r-R)*uPx*.5; return 1.-smoothstep(w*.5, w*.5+1., d); }
  void main(){
    float t = uTm;
    vec2 p = uv-.5; float r = length(p)/.5;
    float ang = atan(p.x, -p.y); if(ang<0.) ang += 2.*PI;        /* 0 no topo, sentido horário */
    float sec = 2.*PI/N;
    float a = abs(mod(ang+sec*.5, sec)-sec*.5)/(sec*.5);           /* 0 no eixo da divisão, 1 na borda */
    vec4 tx = texture(uT, uv);
    float A = tx.r, L = tx.g;
    /* 1. guias a compasso: três círculos e os 10 eixos, a lápis; o compasso dá a volta em .42 s */
    float volta = smoothstep(ang/(2.*PI)-.02, ang/(2.*PI), t/.42);
    float g = max(max(anel(r,.19,1.), anel(r,.5,1.)), anel(r,.985,1.))*volta;
    float eixo = abs(mod(ang+sec*.5, sec)-sec*.5)*length(p)*uPx;   /* distância ao eixo em px */
    g = max(g, (1.-smoothstep(.4,1.3,eixo))*step(r,.985)*smoothstep(r-.05, r, t/.38)*.8);
    g *= 1. - smoothstep(1.25, 1.75, t);
    /* 2. o traço: do centro para fora, simétrico em todas as divisões */
    float tl = .22 + r*.52 + a*.08;
    float ln = L*smoothstep(tl, tl+.06, t);
    /* 3. pontilhado de agulha: cada ponto entra no seu instante; escuros e centro primeiro */
    vec2 cel = floor(uv*1600./2.4);
    float td = .5 + r*.66 + h(cel)*.34 - A*.12;
    float cob = smoothstep(td, td+.04, t);
    float ink = mix(A, smoothstep(.12, .88, A), .45)*cob;   /* bordas um pouco mais firmes, degradê preservado */
    /* o lápis é apagado quando a peça fecha */
    ln *= 1. - smoothstep(1.45, 1.9, t);
    float lapis = max(g*.32, ln*.62)*(1.-ink);
    vec3 cT = vec3(.075,.075,.08), cL = vec3(.30,.29,.28);
    float al = clamp(ink + lapis, 0., 1.);
    vec3 col = cT*ink + cL*lapis;
    o = vec4(col, al);
  }`;
  function sh(gl, t, s) { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(o); return o; }
  window.mandalaHero = function (cv, img) {
    const gl = cv.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
    if (!gl) return { ok: false };
    let P;
    try {
      P = gl.createProgram(); gl.attachShader(P, sh(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(P, sh(gl, gl.FRAGMENT_SHADER, FS)); gl.linkProgram(P);
      if (!gl.getProgramParameter(P, gl.LINK_STATUS)) throw gl.getProgramInfoLog(P);
    } catch (e) { return { ok: false }; }
    const U = n => gl.getUniformLocation(P, n);
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const T = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, T);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return {
      ok: true,
      quadro(t) {
        const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
        const w = Math.round(r.width * dpr), hh = Math.round(r.height * dpr);
        if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; }
        gl.viewport(0, 0, w, hh); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(P);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T); gl.uniform1i(U('uT'), 0);
        gl.uniform1f(U('uTm'), t); gl.uniform1f(U('uPx'), w);
        gl.bindVertexArray(vao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        return true;
      }
    };
  };
  window.mandalaCiclo = 6.4;   /* nasce em 1,6 s, fica à vista, apaga em .5 s */
  window.mandalaEm = function (T) {
    const C = window.mandalaCiclo, t = T % C;
    return { t: Math.min(t, 2.2), al: Math.min(1, Math.max(0, (C - t) / .5)) };
  };
})();
