precision highp float;
precision highp int;

uniform vec2 min;
uniform vec2 max;

uniform vec2 resolution;
uniform int iterations;

uniform int colorMapIndex;

// 高精度計算用の加算関数（整数部と小数部のペア）
vec4 dualAdd(vec4 a,vec4 b){
    vec2 s=a.xy+b.xy;
    vec2 t=a.zw+b.zw;
    s+=floor(t);
    return vec4(s,fract(t));
}

// 高精度計算用の乗算関数（整数部と小数部のペア）
vec4 dualMul(vec4 a,vec4 b){
    vec2 p1=a.xy*b.xy;
    vec2 p2=a.xy*b.zw+a.zw*b.xy;
    vec2 s=p1+floor(p2);
    return vec4(s,fract(p2));
}

// マンデルブロ集合を計算する関数
int Mandelbrot(vec4 c){
    vec4 z=c;
    for(int i=1;i<10000;++i){
        if(i>=iterations)break;
        
        vec4 z2=dualMul(z,z);
        if(z2.x+z2.y>4.)return i;// 発散する場合
        
        // zを更新
        z=dualAdd(vec4(z2.x-z2.y,0.,0.,0.),vec4(0.,2.*z.x*z.y,0.,0.));
        z=dualAdd(z,c);// Cの加算
    }
    return 0;
}

// カラーマップ関数
vec4 RGB_Hue(float _){
    int i=int(floor(_*12.));
    float p=_-float(i);
    float q=1.-p;
    
    if(i==0)return vec4(1.,p,0.,1.);
    if(i==1)return vec4(q,1.,0.,1.);
    if(i==2)return vec4(0.,1.,p,1.);
    if(i==3)return vec4(0.,q,1.,1.);
    if(i==4)return vec4(p,0.,1.,1.);
    if(i==5)return vec4(1.,0.,q,1.);
    if(i==6)return vec4(1.,p,0.,1.);
    if(i==7)return vec4(q,1.,0.,1.);
    if(i==8)return vec4(0.,1.,p,1.);
    if(i==9)return vec4(0.,q,1.,1.);
    if(i==10)return vec4(p,0.,1.,1.);
    if(i==11)return vec4(1.,0.,q,1.);
    return vec4(1.,0.,0.,1.);
}

// 他のカラーマップ
vec4 Red(float _){return vec4(_,0.,0.,1.);}
vec4 Gray(float _){return vec4(_,_,_,1.);}

// 色選択
vec4 Color(float _){
    if(colorMapIndex==0)return RGB_Hue(_);
    if(colorMapIndex==1)return Red(_);
    return Gray(_);
}

void main(void){
    vec4 c=vec4(
        min.x+(max.x-min.x)*gl_FragCoord.x/resolution.x,
        min.y+(max.y-min.y)*gl_FragCoord.y/resolution.y,
        0.,0.
    );
    int i=Mandelbrot(c);
    gl_FragColor=(i==0)?vec4(0.,0.,0.,1.):Color(float(i)/float(iterations));
}
