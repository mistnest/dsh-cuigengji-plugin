// Windows' built-in WPF runtime supplies the transparent native window. No
// Electron copy, web server, downloaded executable or extra user install.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Effects;
using System.Windows.Media.Imaging;
using System.Windows.Threading;

namespace Cuigengji.Desktop {
  public sealed partial class PetWindow : Window {
    readonly string stateDirectory;
    readonly Dictionary<string, BitmapSource> sheets = new Dictionary<string, BitmapSource>();
    readonly Image art = new Image { Width = 128, Height = 128, Stretch = Stretch.Uniform, Cursor = Cursors.Hand };
    readonly Canvas canvas = new Canvas { Width = 148, Height = 148 };
    readonly TranslateTransform bob = new TranslateTransform();
    readonly DispatcherTimer timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(500) };
    Dictionary<string, object> activity;
    Dictionary<string, object> presentation = new Dictionary<string, object>();
    StackPanel usagePanel;
    string usageSignature = "", lastSound = "", lastNotice = "", customPath = "", snap = "none";
    readonly MediaPlayer audio = new MediaPlayer();
    readonly DispatcherTimer gifTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(40) };
    sealed class Gif { public Image Image; public BitmapSource[] Frames; public int[] Delays; public int Index; public DateTime Next; }
    readonly List<Gif> gifs = new List<Gif>();
    Window bubble;
    ScrollViewer bubbleScroll;
    double bubbleAnchorTop = Double.NaN;
    TextBlock bubbleTitle, bubbleScope;
    readonly List<TextBlock> bubbleCounts = new List<TextBlock>();
    string role = "bigfish", mood = "idle", sessionId = "", error = "";
    bool reduced, dragging, moved, headless, shuttingDown, menuOpen;
    Point dragOrigin, windowOrigin;
    DateTime reactionUntil = DateTime.MinValue, celebrationUntil = DateTime.MinValue;
    int parentId;
    long previousTotal = -1;
    string previousScope = "", renderedPose = "";
    static readonly Encoding Utf8 = new UTF8Encoding(false);
    static readonly ControlTemplate RoundedButton = (ControlTemplate)System.Windows.Markup.XamlReader.Parse(@"<ControlTemplate xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation' TargetType='Button'><Border Name='paper' Background='{TemplateBinding Background}' BorderBrush='{TemplateBinding BorderBrush}' BorderThickness='{TemplateBinding BorderThickness}' CornerRadius='8'><ContentPresenter Margin='{TemplateBinding Padding}' HorizontalAlignment='{TemplateBinding HorizontalContentAlignment}' VerticalAlignment='Center'/></Border><ControlTemplate.Triggers><Trigger Property='IsMouseOver' Value='True'><Setter TargetName='paper' Property='Background' Value='{DynamicResource PetHover}'/></Trigger><Trigger Property='IsKeyboardFocused' Value='True'><Setter TargetName='paper' Property='BorderBrush' Value='{DynamicResource PetFocus}'/></Trigger><Trigger Property='IsEnabled' Value='False'><Setter TargetName='paper' Property='Opacity' Value='.5'/></Trigger></ControlTemplate.Triggers></ControlTemplate>");
    static Dictionary<string, object> Obj(object value) { return value as Dictionary<string, object> ?? new Dictionary<string, object>(); }
    static object Get(Dictionary<string, object> row, string key) { object value; return row != null && row.TryGetValue(key, out value) ? value : null; }
    static string Text(Dictionary<string, object> row, string key, string fallback) { return Get(row, key) as string ?? fallback; }
    static long Number(Dictionary<string, object> row, string key) { try { long value = Convert.ToInt64(Get(row, key), CultureInfo.InvariantCulture); return key == "proseAdded" ? value : Math.Max(0, value); } catch { return 0; } }
    static bool Flag(Dictionary<string, object> row, string key, bool fallback) { object value = Get(row, key); return value is bool ? (bool)value : fallback; }
    static void Emit(object value) { Console.WriteLine(new JavaScriptSerializer().Serialize(value)); Console.Out.Flush(); }
    string RoleName { get { return role == "cuigengji" ? "催更姬" : "大肥鱼"; } }

    PetWindow(string directory, string assets, bool hiddenTest) {
      stateDirectory = directory; headless = hiddenTest;
      Title = "催更姬桌宠"; Width = 148; Height = 148; WindowStyle = WindowStyle.None;
      AllowsTransparency = true; Background = Brushes.Transparent; ResizeMode = ResizeMode.NoResize;
      ShowInTaskbar = false; ShowActivated = false; Topmost = true; Content = canvas;
      art.RenderTransform = bob; art.RenderTransformOrigin = new Point(.5, .9);
      art.Effect = new DropShadowEffect { BlurRadius = 7, ShadowDepth = 3, Opacity = .18, Color = Color.FromRgb(30, 43, 75) };
      Canvas.SetLeft(art, 10); Canvas.SetTop(art, 10); canvas.Children.Add(art);
      foreach (string name in new [] { "bigfish", "cuigengji" }) {
        BitmapImage image = new BitmapImage(); image.BeginInit(); image.CacheOption = BitmapCacheOption.OnLoad;
        image.UriSource = new Uri(Path.Combine(assets, name + "-pet-poses.png")); image.EndInit(); image.Freeze(); sheets[name] = image;
      }
      ReadPosition(); UpdateArt();
      art.MouseLeftButtonDown += delegate(object sender, MouseButtonEventArgs e) { dragging = true; moved = false; dragOrigin = ScreenPoint(); windowOrigin = new Point(Left, Top); art.CaptureMouse(); Emit(new {type="interact",kind="press"}); e.Handled = true; };
      art.MouseMove += delegate { if (dragging) MoveTo(ScreenPoint()); };
      art.MouseLeftButtonUp += delegate(object sender, MouseButtonEventArgs e) {
        if (!dragging) return; dragging = false; art.ReleaseMouseCapture();
        Emit(new {type="interact",kind="release"});
        if (moved) { Snap(); ClampToMonitor(); SavePosition(); } else { reactionUntil = DateTime.UtcNow.AddSeconds(1.7); UpdateArt(); bool closing = bubble != null && !menuOpen; ToggleBubble(false); if(closing && Flag(presentation,"advanceOnClick",true)) Emit(new{type="interact",kind="next"}); }
        e.Handled = true;
      };
      art.LostMouseCapture += delegate { if (dragging) { dragging = false; if (moved) { ClampToMonitor(); SavePosition(); } } };
      art.MouseRightButtonUp += delegate(object sender, MouseButtonEventArgs e) { dragging = false; art.ReleaseMouseCapture(); ToggleBubble(true); e.Handled = true; };
      PreviewKeyDown += delegate(object sender, KeyEventArgs e) { if (e.Key == Key.Escape) { CloseBubble(); e.Handled = true; } };
      LocationChanged += delegate { if (bubble != null) PositionBubble(); };
      Closed += delegate { shuttingDown = true; timer.Stop(); gifTimer.Stop(); audio.Close(); CloseBubble(); };
      gifTimer.Tick += delegate { if(reduced) return; foreach(var gif in gifs.ToArray()) if(DateTime.UtcNow >= gif.Next) { gif.Index=(gif.Index+1)%gif.Frames.Length; gif.Image.Source=gif.Frames[gif.Index]; gif.Next=DateTime.UtcNow.AddMilliseconds(gif.Delays[gif.Index]); } }; gifTimer.Start();
      timer.Tick += delegate {
        if (parentId > 0) { try { if (Process.GetProcessById(parentId).HasExited) Shutdown(); } catch { Shutdown(); } }
        if (!dragging) ClampToMonitor();
        UpdateArt();
      };
      timer.Start();
    }
    Point ScreenPoint() {
      System.Drawing.Point point = System.Windows.Forms.Cursor.Position;
      HwndSource source = PresentationSource.FromVisual(this) as HwndSource;
      return source == null ? new Point(point.X, point.Y) : source.CompositionTarget.TransformFromDevice.Transform(new Point(point.X, point.Y));
    }
    Rect WorkArea() {
      IntPtr handle = new WindowInteropHelper(this).Handle;
      var screen = handle != IntPtr.Zero ? System.Windows.Forms.Screen.FromHandle(handle) : !Double.IsNaN(Left) && !Double.IsNaN(Top) ? System.Windows.Forms.Screen.FromPoint(new System.Drawing.Point((int)Left, (int)Top)) : System.Windows.Forms.Screen.PrimaryScreen;
      System.Drawing.Rectangle area = screen.WorkingArea;
      HwndSource source = PresentationSource.FromVisual(this) as HwndSource;
      Matrix scale = source == null ? Matrix.Identity : source.CompositionTarget.TransformFromDevice;
      Point a = scale.Transform(new Point(area.Left, area.Top)), b = scale.Transform(new Point(area.Right, area.Bottom));
      return new Rect(a, b);
    }
    static double Clamp(double value, double minimum, double maximum) { return Math.Max(minimum, Math.Min(value, Math.Max(minimum, maximum))); }
    void ClampToMonitor() { Rect area = WorkArea(); Left = Clamp(Left, area.Left, area.Right - Width); Top = Clamp(Top, area.Top, area.Bottom - Height); }
    void MoveTo(Point point) {
      double dx = point.X - dragOrigin.X, dy = point.Y - dragOrigin.Y;
      if (!moved && Math.Sqrt(dx * dx + dy * dy) < 5) return;
      moved = true; CloseBubble(); Left = windowOrigin.X + dx; Top = windowOrigin.Y + dy;
      // Clamping on every mousemove traps the pet on its original monitor.
      // Follow the captured pointer across screens, then fit on release.
    }
    void ResetPosition() { Rect area = WorkArea(); Left = area.Right - Width - 18; Top = area.Bottom - Height - 16; ClampToMonitor(); SavePosition(); }
    void Snap() { if(snap=="none") return; Rect area=WorkArea(); if(snap=="custom"){var z=Obj(Get(Obj(Get(presentation,"appearance")),"snapZones"));bool percent=Text(z,"unit","percent")=="percent";double l=Number(z,"left")*(percent?area.Width/100:1),r=Number(z,"right")*(percent?area.Width/100:1),t=Number(z,"top")*(percent?area.Height/100:1),b=Number(z,"bottom")*(percent?area.Height/100:1);if(l>0&&Left-area.Left<=l)Left=area.Left;else if(r>0&&area.Right-Left-Width<=r)Left=area.Right-Width;if(t>0&&Top-area.Top<=t)Top=area.Top;else if(b>0&&area.Bottom-Top-Height<=b)Top=area.Bottom-Height;}else if(snap=="corners") { Left=Left+Width/2<area.Left+area.Width/2?area.Left:area.Right-Width; Top=Top+Height/2<area.Top+area.Height/2?area.Top:area.Bottom-Height; } else { double[] gaps={Math.Abs(Left-area.Left),Math.Abs(area.Right-Left-Width),Math.Abs(Top-area.Top),Math.Abs(area.Bottom-Top-Height)}; int side=0;for(int i=1;i<4;i++)if(gaps[i]<gaps[side])side=i;if(side==0)Left=area.Left;else if(side==1)Left=area.Right-Width;else if(side==2)Top=area.Top;else Top=area.Bottom-Height; } ApplyMirror(); }
    void ApplyMirror(){var a=Obj(Get(presentation,"appearance"));bool flipped=Flag(a,"flipped",false)^ (Flag(a,"autoFlip",false)&&Math.Abs(Left-WorkArea().Left)<2);art.LayoutTransform=new ScaleTransform(flipped?-1:1,1);}
    void ReadPosition() {
      Rect area = WorkArea(); Left = area.Right - Width - 18; Top = area.Bottom - Height - 16;
      try {
        string file = Path.Combine(stateDirectory, "pet-desktop-position.json");
        if (!File.Exists(file) || new FileInfo(file).Length > 4096) return;
        var saved = Obj(new JavaScriptSerializer().DeserializeObject(File.ReadAllText(file, Utf8)));
        double x = Convert.ToDouble(Get(saved, "left"), CultureInfo.InvariantCulture), y = Convert.ToDouble(Get(saved, "top"), CultureInfo.InvariantCulture);
        if (!Double.IsNaN(x) && !Double.IsInfinity(x) && !Double.IsNaN(y) && !Double.IsInfinity(y)) { Left = x; Top = y; ClampToMonitor(); }
      } catch { /* A missing/unplugged monitor or damaged preference uses the visible default. */ }
    }
    void SavePosition() {
      try {
        Directory.CreateDirectory(stateDirectory); string path = Path.Combine(stateDirectory, "pet-desktop-position.json"), temp = path + ".tmp";
        File.WriteAllText(temp, new JavaScriptSerializer().Serialize(new { left = Left, top = Top }), Utf8);
        if (File.Exists(path)) File.Replace(temp, path, null); else File.Move(temp, path);
      } catch { /* Position is device UI; a write failure must not close the pet or touch novels. */ }
    }
    string CurrentMood() {
      if (error.Length > 0) return "error";
      if (DateTime.UtcNow < reactionUntil) return "reacting";
      if (mood == "waiting" || mood == "writing") return mood;
      if (DateTime.UtcNow < celebrationUntil) return "celebrate";
      return mood;
    }
    int Pose(string value) {
      if (role == "bigfish") {
        if (value == "thinking" || value == "waiting") return 1;
        if (value == "writing") return 2;
        if (value == "celebrate" || value == "reacting") return 3;
        if (value == "sleepy") return 4;
        if (value == "error") return 5;
        return 0;
      }
      if (value == "writing" || value == "sleepy") return 1;
      if (value == "celebrate" || value == "reacting") return 2;
      if (value == "thinking" || value == "waiting" || value == "error") return 3;
      return 0;
    }
    void UpdateArt() {
      string current = CurrentMood(), key = role + ":" + current + ":" + reduced;
      if (renderedPose == key) return; renderedPose = key;
      if(customPath.Length==0) { BitmapSource sheet = sheets[role]; int columns = role == "bigfish" ? 3 : 2, size = sheet.PixelWidth / columns, pose = Pose(current);
      var crop = new CroppedBitmap(sheet, new Int32Rect((pose % columns) * size, (pose / columns) * size, size, size)); crop.Freeze(); art.Source = crop; }
      System.Windows.Automation.AutomationProperties.SetName(art, RoleName + "桌宠");
      bob.BeginAnimation(TranslateTransform.YProperty, null); bob.Y = 0;
      if (!reduced) {
        bool hop = current == "reacting" || current == "celebrate";
        var animation = new DoubleAnimation(0, hop ? -6 : -2, TimeSpan.FromSeconds(hop ? .35 : current == "sleepy" ? 3 : 2)) { AutoReverse = true, RepeatBehavior = hop ? new RepeatBehavior(2) : RepeatBehavior.Forever };
        bob.BeginAnimation(TranslateTransform.YProperty, animation);
      }
      RefreshBubbleText();
    }
    void Apply(Dictionary<string, object> update) {
      if (Text(update, "type", "") == "quit") { Shutdown(); return; }
      if (headless && Text(update, "type", "") == "test-command") {
        string command = Text(update, "action", "");
        if (command == "role") Preference(true, role == "bigfish" ? "cuigengji" : "bigfish");
        else if (command == "hide") Preference(false, role);
        else if (command == "details") Emit(new { type = "details", sessionId = sessionId });
        else if (command == "crash") Shutdown();
        return;
      }
      if (Text(update, "type", "") != "update") return;
      role = Text(update, "role", role) == "cuigengji" ? "cuigengji" : "bigfish";
      reduced = Flag(update, "reduced", reduced); mood = Text(update, "mood", "idle");
      string nextSession = Text(update, "sessionId", "");
      if (nextSession != sessionId) { reactionUntil = DateTime.MinValue; celebrationUntil = DateTime.MinValue; }
      sessionId = nextSession; error = Text(update, "error", "");
      var nextPresentation=Get(update,"presentation") as Dictionary<string,object>;
      if(nextPresentation!=null) presentation=nextPresentation;
      var next = Get(update, "activity") as Dictionary<string, object>;
      if (next != null) {
        string scope = Text(next, "date", "") + ":" + Text(next, "novelId", "library");
        var stats = Obj(Get(next, "stats")); long total = Number(stats, "proseAdded") + Number(stats, "settingAdded") + Number(stats, "planningChanges");
        if (scope == previousScope && previousTotal >= 0 && total > previousTotal) celebrationUntil = DateTime.UtcNow.AddSeconds(2.6);
        previousScope = scope; previousTotal = total; activity = next;
      } else { activity = null; previousScope = ""; previousTotal = -1; }
      if (Flag(update, "resetPosition", false)) ResetPosition();
      UpdateArt();
      RefreshBubbleText();
      if (!headless) {
        if (Flag(update, "visible", true)) { if (!IsVisible) Show(); }
        else { CloseBubble(); Hide(); }
      }
      if(nextPresentation!=null) ApplyPresentation();
      if (headless) Emit(new { type = "test-state", role = role, title = Text(activity, "title", ""), mood = CurrentMood(), visible = Flag(update, "visible", true) });
    }
    void LoadImage(Image image,string path,string mime) {
      gifs.RemoveAll(g=>g.Image==image);
      if(!File.Exists(path)) return;
      try {
        if(mime=="image/gif") { GifBitmapDecoder decoder;using(var file=File.OpenRead(path))decoder=new GifBitmapDecoder(file,BitmapCreateOptions.PreservePixelFormat,BitmapCacheOption.OnLoad);
          Gif gif=ComposeGif(decoder);gif.Image=image;gif.Next=DateTime.UtcNow.AddMilliseconds(gif.Delays[0]);image.Source=gif.Frames[0];gifs.Add(gif);
        } else { var bitmap=new BitmapImage(); bitmap.BeginInit();bitmap.CacheOption=BitmapCacheOption.OnLoad;bitmap.UriSource=new Uri(path);bitmap.EndInit();bitmap.Freeze();image.Source=bitmap; }
      }catch { /* A broken optional asset cannot close the desktop pet. */ }
    }
    static int Meta(BitmapMetadata metadata,string path,int fallback) {try{return metadata!=null&&metadata.ContainsQuery(path)?Convert.ToInt32(metadata.GetQuery(path)):fallback;}catch{return fallback;}}
    // WIC returns partial GIF frames. Composite offsets and disposal ourselves;
    // swapping raw frames loses the previous canvas and leaves transparency trails.
    // Metadata paths: learn.microsoft.com/windows/win32/wic/-wic-native-image-format-metadata-queries
    static Gif ComposeGif(GifBitmapDecoder decoder) {
      int width=Meta(decoder.Metadata,"/logscrdesc/Width",decoder.Frames[0].PixelWidth),height=Meta(decoder.Metadata,"/logscrdesc/Height",decoder.Frames[0].PixelHeight),count=decoder.Frames.Count;
      if(width<=0||height<=0||width>4096||height>4096||count>500||(long)width*height*count>24000000)throw new Exception("GIF exceeds animation memory limit");
      var output=new BitmapSource[count];var delays=new int[count];byte[] pixels=new byte[width*height*4],restore=null;int disposal=0,left=0,top=0,fw=0,fh=0;
      Color background=Colors.Transparent;
      if(Meta(decoder.Frames[0].Metadata as BitmapMetadata,"/grctlext/TransparencyFlag",0)==0&&decoder.Palette!=null){int index=Meta(decoder.Metadata,"/logscrdesc/BackgroundColorIndex",0);if(index<decoder.Palette.Colors.Count)background=decoder.Palette.Colors[index];}
      for(int p=0;p<pixels.Length;p+=4){pixels[p]=background.B;pixels[p+1]=background.G;pixels[p+2]=background.R;pixels[p+3]=background.A;}
      for(int i=0;i<count;i++) {
        if(disposal==2)for(int y=top;y<Math.Min(top+fh,height);y++)for(int x=left;x<Math.Min(left+fw,width);x++){int p=(y*width+x)*4;pixels[p]=background.B;pixels[p+1]=background.G;pixels[p+2]=background.R;pixels[p+3]=background.A;}
        else if(disposal==3&&restore!=null)Array.Copy(restore,pixels,pixels.Length);
        var frame=decoder.Frames[i];var metadata=frame.Metadata as BitmapMetadata;
        left=Meta(metadata,"/imgdesc/Left",0);top=Meta(metadata,"/imgdesc/Top",0);fw=Meta(metadata,"/imgdesc/Width",frame.PixelWidth);fh=Meta(metadata,"/imgdesc/Height",frame.PixelHeight);disposal=Meta(metadata,"/grctlext/Disposal",0);
        restore=disposal==3?(byte[])pixels.Clone():null;
        var converted=new FormatConvertedBitmap(frame,PixelFormats.Bgra32,null,0);int stride=converted.PixelWidth*4;var part=new byte[stride*converted.PixelHeight];converted.CopyPixels(part,stride,0);
        for(int y=0;y<Math.Min(fh,converted.PixelHeight)&&top+y<height;y++)for(int x=0;x<Math.Min(fw,converted.PixelWidth)&&left+x<width;x++){int src=y*stride+x*4,dst=((top+y)*width+left+x)*4;if(part[src+3]!=0)Array.Copy(part,src,pixels,dst,4);}
        var bitmap=BitmapSource.Create(width,height,96,96,PixelFormats.Bgra32,null,pixels,width*4);bitmap.Freeze();output[i]=bitmap;delays[i]=Math.Max(40,Meta(metadata,"/grctlext/Delay",10)*10);
      }
      return new Gif{Frames=output,Delays=delays};
    }
    void ApplyPresentation() {
      var appearance=Obj(Get(presentation,"appearance")); double scale=1;try{scale=Clamp(Convert.ToDouble(Get(appearance,"scale")),.5,2);}catch{}
      Width=Height=148*scale;canvas.RenderTransform=new ScaleTransform(scale,scale); ApplyMirror();snap=Text(appearance,"snap","none");
      string path=Text(appearance,"rolePath","");if(path!=customPath){customPath=path;gifs.RemoveAll(g=>g.Image==art);if(path.Length>0)LoadImage(art,path,Text(appearance,"roleMime",""));renderedPose="";}
      var notice=Obj(Get(presentation,"event"));string noticeId=Text(notice,"id","");bool touch=noticeId.StartsWith("touch:");
      // Hidden pets and an open menu defer delivery. A poll must not consume a
      // notification that the author has never been able to see or hear.
      if(headless||!IsVisible||menuOpen||dragging&&(!touch||moved)){RefreshUsage();return;}
      var sound=Obj(Get(presentation,"sound"));string soundId=Text(sound,"id","");if(soundId.Length>0&&soundId!=lastSound){lastSound=soundId;try{audio.Open(new Uri(Text(sound,"path","")));audio.Volume=Convert.ToDouble(Get(sound,"volume"));if(!headless)audio.Play();}catch{}}
      if(noticeId.Length>0&&noticeId!=lastNotice) {
        lastNotice=noticeId;
        if(!touch)Emit(new{type="delivered",id=noticeId});
      }
      RefreshUsage();
    }
    void RefreshUsage() {
      if(usagePanel==null||bubble==null||menuOpen)return;
      RefreshQuickSummary();
      string signature=new JavaScriptSerializer().Serialize(Get(presentation,"lines"));if(signature==usageSignature)return;usageSignature=signature;usagePanel.Children.Clear();gifs.RemoveAll(g=>g.Image!=art);
      var lines=Get(presentation,"lines") as object[];if(lines==null)return;
      foreach(var value in lines) {
        var segments=Get(Obj(value),"segments") as object[];if(segments==null)continue;var row=new TextBlock{TextWrapping=TextWrapping.Wrap,Margin=new Thickness(0,4,0,4),FontSize=12,Foreground=Ink};
        foreach(var item in segments){var segment=Obj(item);string kind=Text(segment,"kind","text");
          if(kind=="image"){var image=new Image{MaxWidth=220,MaxHeight=140,Stretch=Stretch.Uniform};LoadImage(image,Text(segment,"path",""),Text(segment,"mime",""));usagePanel.Children.Add(image);continue;}
          var run=new Run(Text(segment,"text",""));var style=Obj(Get(segment,"style"));
          try{if(Get(style,"size")!=null)run.FontSize=Clamp(Convert.ToDouble(Get(style,"size")),9,40);if(Get(style,"font")!=null)run.FontFamily=new FontFamily(Text(style,"font","Microsoft YaHei"));if(Get(style,"color")!=null)run.Foreground=(Brush)new BrushConverter().ConvertFromString(Text(style,"color","#28354F"));if(Get(style,"background")!=null)run.Background=(Brush)new BrushConverter().ConvertFromString(Text(style,"background","#FFFFFF"));if(Get(style,"gradient")!=null)run.Background=new LinearGradientBrush((Color)ColorConverter.ConvertFromString(Text(style,"background","#FFFFFF")),(Color)ColorConverter.ConvertFromString(Text(style,"gradient","#FFFFFF")),0);if(Flag(style,"bold",false))run.FontWeight=FontWeights.Bold;if(Flag(style,"italic",false))run.FontStyle=FontStyles.Italic;if(Flag(style,"underline",false))run.TextDecorations=TextDecorations.Underline;}catch{}
          if(kind=="link"){string link=Text(segment,"url","");var hyperlink=new Hyperlink(run);hyperlink.Click+=delegate{Uri url;if(Uri.TryCreate(link,UriKind.Absolute,out url)&&(url.Scheme=="https"||url.Scheme=="http"))try{Process.Start(new ProcessStartInfo(link){UseShellExecute=true});}catch{}};row.Inlines.Add(hyperlink);}else row.Inlines.Add(run);
        }usagePanel.Children.Add(row);
      }
    }
    static Brush Ink { get { return ColorBrush("#292633", "#ECEAF2"); } }
    static TextBlock Copy(string text, double size) { return new TextBlock { Text = text, FontSize = size, Foreground = Ink, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 0, 0, 8) }; }
    Button Action(string text, Action action) {
      var button = new Button { Content = text, FontSize = 12, Padding = new Thickness(10, 7, 10, 7), Margin = new Thickness(0, 3, 0, 3), Background = Paper, Foreground = Ink, BorderBrush = Line, BorderThickness = new Thickness(1), Cursor = Cursors.Hand, HorizontalContentAlignment = HorizontalAlignment.Center };
      button.Resources["PetHover"] = Wash; button.Resources["PetFocus"] = Accent; button.Template = RoundedButton; button.Click += delegate { action(); }; return button;
    }
    void Preference(bool visible, string nextRole) { role = nextRole; Emit(new { type = "preferences", role = role, visible = visible }); UpdateArt(); if (!visible) { CloseBubble(); Hide(); } }
    void ToggleBubble(bool menu) { if (bubble != null && menuOpen == menu) { CloseBubble(); return; } CloseBubble(); RebuildBubble(menu); }
    void RebuildBubble(bool menu) {
      menuOpen = menu;
      if (bubble == null) {
        bubbleAnchorTop = Double.NaN;
        bubble = new Window { Title = "催更姬写作陪伴", Width = Math.Min(menu ? 280 : 340, Math.Max(120, WorkArea().Width - 16)), MaxHeight = WorkArea().Height - 16, SizeToContent = SizeToContent.Height, WindowStyle = WindowStyle.None, AllowsTransparency = true, Background = Brushes.Transparent, ShowInTaskbar = false, ResizeMode = ResizeMode.NoResize, Topmost = true, ShowActivated = true, UseLayoutRounding = true, SnapsToDevicePixels = true, FontFamily = new FontFamily("Segoe UI, Microsoft YaHei") };
        TextOptions.SetTextFormattingMode(bubble, TextFormattingMode.Display);
        bubble.Deactivated += delegate { if (!new Rect(Left, Top, Width, Height).Contains(ScreenPoint())) CloseBubble(); };
        bubble.SizeChanged += delegate { PositionBubble(); };
        bubble.PreviewKeyDown += delegate(object sender, KeyEventArgs e) { if (e.Key == Key.Escape) CloseBubble(); };
      }
      var layout = new Grid(); layout.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); layout.RowDefinitions.Add(new RowDefinition()); layout.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); layout.Children.Add(BuildBubbleHeader());
      var content = new StackPanel();
      if (menu) {
        content.Children.Add(Action("切换为" + (role == "bigfish" ? "催更姬" : "大肥鱼"), delegate { Preference(true, role == "bigfish" ? "cuigengji" : "bigfish"); CloseBubble(); }));
        content.Children.Add(Action("回到屏幕右下角", delegate { ResetPosition(); CloseBubble(); }));
        content.Children.Add(Action("暂时隐藏", delegate { Preference(false, role); }));
      } else {
        content.Children.Add(BuildQuickSummary());
        var footer = BuildBubbleFooter(); Grid.SetRow(footer, 2); layout.Children.Add(footer);
      }
      bubbleScroll = new ScrollViewer { Content = content, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled, MaxHeight = Math.Max(80, WorkArea().Height - 128), Margin = new Thickness(16, 0, 16, 12) }; Grid.SetRow(bubbleScroll, 1); layout.Children.Add(bubbleScroll);
      var paper = new Border { Child = layout, Background = Paper, BorderBrush = Line, BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(18), Margin = new Thickness(6), Effect = new DropShadowEffect { Color = Color.FromRgb(54, 32, 68), BlurRadius = 12, ShadowDepth = 2, Opacity = .12 } }; bubble.Content = paper;
      RefreshBubbleText();
      RefreshUsage();
      bubble.Measure(new Size(bubble.Width, Double.PositiveInfinity)); bubble.Arrange(new Rect(0, 0, bubble.Width, bubble.DesiredSize.Height));
      PositionBubble(); bubbleAnchorTop = bubble.Top;
      // Expanding keeps the header/footer in place. Extra content scrolls when
      // the pet is near the bottom edge instead of relocating every button.
      double chrome = bubble.DesiredSize.Height - bubbleScroll.DesiredSize.Height;
      bubbleScroll.MaxHeight = Math.Max(80, Math.Min(560, WorkArea().Bottom - bubbleAnchorTop - chrome - 8));
      if (!headless && !bubble.IsVisible) { bubble.Show(); if (!reduced && SystemParameters.ClientAreaAnimation) paper.BeginAnimation(UIElement.OpacityProperty, new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(150)) { FillBehavior = FillBehavior.Stop }); }
    }
    void RefreshBubbleText() {
      if (bubble == null || menuOpen || bubbleCounts.Count != 4) return;
      bubbleTitle.Text = RoleName;
      RefreshQuickSummary();
    }
    void PositionBubble() {
      if (bubble == null) return; Rect area = WorkArea(); double width = bubble.Width, height = Math.Max(160, bubble.ActualHeight > 0 ? bubble.ActualHeight : bubble.DesiredSize.Height), x = Left - width - 4, y = Top + Height - height;
      if (x < area.Left + 8) x = Left + Width + 4;
      if (x + width > area.Right - 8) { x = Left + (Width - width) / 2; y = Top - height - 4; }
      bubble.Left = Clamp(x, area.Left + 8, area.Right - width - 8); bubble.Top = Clamp(Double.IsNaN(bubbleAnchorTop) ? y : bubbleAnchorTop, area.Top + 8, area.Bottom - height - 8);
    }
    void CloseBubble() {
      if (bubble == null) return;
      Window previous = bubble;
      bubble = null;
      bubbleScroll = null;
      bubbleAnchorTop = Double.NaN;
      gifs.RemoveAll(g => g.Image != art);
      menuOpen = false;
      previous.Close();
    }
    void Shutdown() { if (shuttingDown) return; shuttingDown = true; timer.Stop(); CloseBubble(); Close(); Application.Current.Shutdown(); }

    public static void Run(string directory, string assets, int parent, bool headless) {
      string identity;
      using (var hash = System.Security.Cryptography.SHA256.Create()) identity = BitConverter.ToString(hash.ComputeHash(Utf8.GetBytes(Path.GetFullPath(directory).ToUpperInvariant()))).Replace("-", "");
      using (var mutex = new Mutex(false, "Local\\Cuigengji.Pet." + identity)) {
      bool owned;
      try { owned = mutex.WaitOne(2500); } catch (AbandonedMutexException) { owned = true; }
      if (!owned) throw new InvalidOperationException("这份工作库的桌宠仍在退出，请稍后重试。");
      try {
      var app = new Application { ShutdownMode = ShutdownMode.OnExplicitShutdown };
      var window = new PetWindow(directory, assets, headless); window.parentId = parent;
      new WindowInteropHelper(window).EnsureHandle();
      var reader = new Thread(delegate() {
        try {
          string line;
          while ((line = Console.ReadLine()) != null) {
            if (line.Length > 16384) continue;
            var value = Obj(new JavaScriptSerializer().DeserializeObject(line));
            app.Dispatcher.BeginInvoke(new Action(delegate { window.Apply(value); }));
          }
        } catch { }
        app.Dispatcher.BeginInvoke(new Action(window.Shutdown));
      }); reader.IsBackground = true; reader.Start();
      Emit(new { type = "ready", protocol = 1, handle = new WindowInteropHelper(window).Handle.ToInt64() });
      app.Run();
      } finally { mutex.ReleaseMutex(); }
      }
    }
    static void AssertQuickHit(System.Windows.Controls.Primitives.ButtonBase button, FrameworkElement visual) {
      if (button == null || button.ActualWidth < 16 || button.ActualHeight < 24) throw new Exception("A compact action has no usable hit area");
      foreach (double x in new[] { button.ActualWidth / 2, button.ActualWidth - 8 }) {
        var point = button.TranslatePoint(new Point(x, button.ActualHeight / 2), visual);
        var hit = VisualTreeHelper.HitTest(visual, point); DependencyObject node = hit == null ? null : hit.VisualHit;
        while (node != null && node != button) node = VisualTreeHelper.GetParent(node);
        if (node != button) throw new Exception("A compact action does not hit its painted area: " + System.Windows.Automation.AutomationProperties.GetName(button) + " at " + point + " within " + visual.RenderSize + "; hit " + (hit == null ? "nothing" : hit.VisualHit.GetType().Name));
      }
    }
    static void PumpQuickMotion(int milliseconds) {
      var frame = new DispatcherFrame(); var finish = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(milliseconds) };
      finish.Tick += delegate { finish.Stop(); frame.Continue = false; }; finish.Start(); Dispatcher.PushFrame(frame);
    }
    public static void SelfTest(string directory, string assets, string output) {
      Directory.CreateDirectory(output); var app = new Application { ShutdownMode = ShutdownMode.OnExplicitShutdown };
      var window = new PetWindow(directory, assets, true); var checks = new List<string>(); var renders = new HashSet<string>();
      if (!window.AllowsTransparency || window.WindowStyle != WindowStyle.None || window.ShowInTaskbar || window.ShowActivated || !window.Topmost) throw new Exception("Native window flags are incorrect");
      checks.Add("transparent, topmost, no taskbar, does not steal focus");
      foreach (string role in new[] { "bigfish", "cuigengji" }) {
        foreach (string mood in new[] { "idle", "writing", "waiting", "sleepy", "reacting", "error" }) {
          window.role = role; window.mood = mood; window.reduced = true;
          window.reactionUntil = mood == "reacting" ? DateTime.UtcNow.AddSeconds(5) : DateTime.MinValue;
          window.UpdateArt(); window.canvas.Measure(new Size(148, 148)); window.canvas.Arrange(new Rect(0, 0, 148, 148)); window.canvas.UpdateLayout();
          var rendered = new RenderTargetBitmap(148, 148, 96, 96, PixelFormats.Pbgra32); rendered.Render(window.canvas);
          byte[] pixels = new byte[148 * 148 * 4]; rendered.CopyPixels(pixels, 148 * 4, 0);
          if (pixels[3] != 0 || pixels[(148 * 148 - 1) * 4 + 3] != 0) throw new Exception("Sprite has opaque background corners");
          bool visible = false; for (int p = 3; p < pixels.Length; p += 4) if (pixels[p] > 128) { visible = true; break; }
          if (!visible) throw new Exception("Sprite render is empty");
          using (var hash = System.Security.Cryptography.SHA256.Create()) renders.Add(BitConverter.ToString(hash.ComputeHash(pixels)));
          var encoder = new PngBitmapEncoder(); encoder.Frames.Add(BitmapFrame.Create(rendered));
          using (var file = File.Create(Path.Combine(output, role + "-" + mood + ".png"))) encoder.Save(file);
        }
      }
      if (renders.Count < 10) throw new Exception("Role/pose renders did not change: " + renders.Count);
      checks.Add("12 native sprite renders: exact tiles, transparent corners, nonempty art");
      Rect area = window.WorkArea();
      window.dragOrigin = new Point(0, 0); window.windowOrigin = new Point(area.Right - 100, area.Top + 20); window.moved = false;
      window.MoveTo(new Point(300, 0));
      if (window.Left <= area.Right) throw new Exception("Dragging is trapped on the original monitor");
      window.ClampToMonitor();
      if (window.Left + window.Width > window.WorkArea().Right + 1) throw new Exception("Released pet can remain off screen");
      checks.Add("drag can cross a monitor edge and fits the work area on release");
      window.dragOrigin = new Point(0, 0); window.windowOrigin = new Point(300, 300); window.moved = false;
      window.MoveTo(new Point(20, 10)); window.MoveTo(new Point(40, 20));
      if (Math.Abs(window.Left - 340) > 1 || Math.Abs(window.Top - 320) > 1) throw new Exception("Native drag accumulated delta");
      window.SavePosition(); var restored = new PetWindow(directory, assets, true);
      if (Math.Abs(restored.Left - window.Left) > 1 || Math.Abs(restored.Top - window.Top) > 1) throw new Exception("Native position did not survive restart");
      checks.Add("multi-step drag and position persistence");
      window.Apply(Obj(new JavaScriptSerializer().DeserializeObject("{\"type\":\"update\",\"sessionId\":\"test\",\"role\":\"cuigengji\",\"reduced\":true,\"activity\":{\"date\":\"2026-11-02\",\"novelId\":\"test\",\"title\":\"桌宠验收作品\",\"stats\":{\"proseAdded\":1234,\"settingAdded\":120,\"planningChanges\":3,\"conversationInput\":420}},\"presentation\":{\"summary\":{\"date\":\"2026-11-02\",\"tokens\":286420,\"calls\":12,\"input\":48210,\"cacheRead\":192810,\"output\":45400,\"currency\":\"CNY\",\"unpriced\":1,\"costs\":{\"CNY\":\"0.801873\"},\"balanceTotals\":{\"CNY\":\"86.244999\"},\"balances\":[{\"id\":\"synthetic\",\"name\":\"合成账户\",\"currency\":\"CNY\",\"balance\":\"86.244999\",\"at\":1793600000000}]},\"customContent\":false}}")));
      window.RebuildBubble(false); var visual = (FrameworkElement)window.bubble.Content; var previousCount = window.bubbleCounts[0];
      Obj(Get(window.activity, "stats"))["proseAdded"] = 1235; window.RefreshBubbleText();
      if (window.bubble.Content != visual || window.bubbleCounts[0] != previousCount || previousCount.Text != "+1,235") throw new Exception("Progress refresh replaced the active bubble controls");
      Obj(Get(window.activity, "stats"))["proseAdded"] = -500; window.RefreshBubbleText();
      if (previousCount.Text != "-500") throw new Exception("Negative daily prose was clamped to zero");
      checks.Add("native bubble retains signed daily prose changes");
      if(window.quickWriting.IsExpanded || window.bubbleCounts[3].Text != "420" || window.quickTokens.Text != "286,420" || ((TextBlock)window.quickCosts.Children[0]).Text != "¥ 0.80" || ((TextBlock)window.quickBalances.Children[0]).Text != "¥ 86.24") throw new Exception("Compact summary metrics or precision are incorrect");
      window.quickWriting.IsExpanded = true; window.RefreshBubbleText(); if(!window.quickWriting.IsExpanded || window.bubbleCounts[3].Text != "420") throw new Exception("Polling reset the expanded writing section");
      window.quickWriting.IsExpanded = false;
      checks.Add("compact native Token, two-decimal costs/balance, author input and stable expansion state");
      Obj(Get(window.activity, "stats"))["proseAdded"] = 1234; window.RefreshBubbleText();
      visual.Measure(new Size(340, 900)); visual.Arrange(new Rect(0, 0, 340, visual.DesiredSize.Height));
      visual.UpdateLayout();
      AssertQuickHit(window.quickClose, visual); AssertQuickHit(window.quickRecords, visual);
      foreach (var fold in new[] { window.quickToken, window.quickBalance, window.quickWriting }) {
        fold.ApplyTemplate(); AssertQuickHit(fold.Template.FindName("toggle", fold) as System.Windows.Controls.Primitives.ButtonBase, visual);
      }
      var shot = new RenderTargetBitmap(340, (int)Math.Ceiling(visual.ActualHeight), 96, 96, PixelFormats.Pbgra32); shot.Render(visual); var png = new PngBitmapEncoder(); png.Frames.Add(BitmapFrame.Create(shot)); using (var file = File.Create(Path.Combine(output, "native-bubble.png"))) png.Save(file);
      checks.Add("native progress bubble renders without showing a desktop window");
      double headerY = window.quickClose.TranslatePoint(new Point(), visual).Y;
      window.quickBalance.IsExpanded = true; window.quickToken.IsExpanded = true; window.quickWriting.IsExpanded = true;
      window.bubble.Measure(new Size(340, 900)); window.bubble.Arrange(new Rect(0, 0, 340, window.bubble.DesiredSize.Height)); window.bubble.UpdateLayout();
      visual.Measure(new Size(340, 900)); visual.Arrange(new Rect(0, 0, 340, visual.DesiredSize.Height)); visual.UpdateLayout();
      if (window.quickReveals[window.quickBalance].ActualWidth < 1.8 * window.quickBalance.ActualWidth) throw new Exception("Balance details are confined to the narrow amount column");
      window.bubbleScroll.ScrollToBottom(); visual.UpdateLayout();
      AssertQuickHit(window.quickClose, visual); AssertQuickHit(window.quickRecords, visual);
      if (Math.Abs(window.quickClose.TranslatePoint(new Point(), visual).Y - headerY) > .5) throw new Exception("The close action moved while expanding details");
      shot = new RenderTargetBitmap(340, (int)Math.Ceiling(visual.ActualHeight), 96, 96, PixelFormats.Pbgra32); shot.Render(visual); png = new PngBitmapEncoder(); png.Frames.Add(BitmapFrame.Create(shot)); using (var file = File.Create(Path.Combine(output, "native-expanded.png"))) png.Save(file);
      checks.Add("native buttons hit their painted areas; full-width account details and pinned actions stay accessible while scrolling");
      window.quickBalance.IsExpanded = false; window.quickToken.IsExpanded = false; window.quickWriting.IsExpanded = false;
      if (SystemParameters.ClientAreaAnimation) {
        window.headless = false; window.reduced = false; window.quickToken.IsExpanded = true;
        PumpQuickMotion(70);
        window.quickToken.IsExpanded = false; window.quickToken.IsExpanded = true; window.quickToken.IsExpanded = false;
        PumpQuickMotion(250);
        var reveal = (Border)window.quickToken.Template.FindName("reveal", window.quickToken);
        if (reveal.Visibility != Visibility.Collapsed || reveal.HasAnimatedProperties) throw new Exception("An interrupted disclosure animation left stale content or clocks");
        window.headless = true; window.reduced = true;
        checks.Add("native disclosure animations can reverse repeatedly and finish fully collapsed");
      }
      string gifFile=Path.Combine(directory,"test-animation.gif");
      if(File.Exists(gifFile)) {
        var expected=Obj(new JavaScriptSerializer().DeserializeObject(File.ReadAllText(Path.Combine(directory,"test-animation.json"),Utf8)));GifBitmapDecoder decoder;using(var file=File.OpenRead(gifFile))decoder=new GifBitmapDecoder(file,BitmapCreateOptions.PreservePixelFormat,BitmapCacheOption.OnLoad);
        var composed=ComposeGif(decoder);var frames=Get(expected,"frames") as object[];if(frames.Length!=composed.Frames.Length)throw new Exception("GIF frame count mismatch");
        for(int i=0;i<frames.Length;i++){var actual=new byte[composed.Frames[i].PixelWidth*composed.Frames[i].PixelHeight*4];composed.Frames[i].CopyPixels(actual,composed.Frames[i].PixelWidth*4,0);var wanted=Convert.FromBase64String((string)frames[i]);for(int p=0;p<actual.Length;p++)if(actual[p]!=wanted[p]&&(p%4==3||wanted[p/4*4+3]!=0))throw new Exception("Partial GIF composition mismatch at frame "+i+", byte "+p);}
        checks.Add("GIF partial frame offsets, transparency and background/previous disposal compose correctly");
      }
      window.CloseBubble();
      window.presentation=Obj(new JavaScriptSerializer().DeserializeObject("{\"appearance\":{\"scale\":1.5,\"flipped\":true,\"snap\":\"corners\"},\"event\":{\"id\":\"legacy-reminder\",\"kind\":\"complete\"},\"showBubble\":true,\"ttl\":1,\"lines\":[{\"segments\":[{\"kind\":\"text\",\"text\":\"模型估算 0.012 CNY\",\"style\":{\"size\":13,\"bold\":true}}]}]}"));
      window.ApplyPresentation();
      if (window.Width != 222 || window.bubble != null) throw new Exception("Appearance or manual bubble opening ignored");
      window.ToggleBubble(false);
      Window opened = window.bubble;
      window.ApplyPresentation();
      if (opened == null || window.bubble != opened) throw new Exception("Presentation update replaced the manually opened bubble");
      window.snap="corners";window.Snap();
      window.RefreshUsage();if(window.usagePanel.Children.Count==0)throw new Exception("Usage modules not rendered");
      checks.Add("manual native bubble, usage modules, scale/flip and corner snap work");
      window.presentation=Obj(new JavaScriptSerializer().DeserializeObject("{\"appearance\":{\"flipped\":false,\"autoFlip\":true,\"snapZones\":{\"unit\":\"px\",\"left\":80,\"right\":0,\"top\":0,\"bottom\":0}}}"));
      area=window.WorkArea();window.snap="custom";window.Left=area.Left+24;window.Top=area.Top+80;window.Snap();
      if(Math.Abs(window.Left-area.Left)>1||((ScaleTransform)window.art.LayoutTransform).ScaleX!=-1)throw new Exception("Custom snap or edge mirror ignored");
      window.Left=area.Right-window.Width-24;window.Snap();if(Math.Abs(window.Left-(area.Right-window.Width-24))>1)throw new Exception("Disabled snap edge moved the pet");
      checks.Add("custom snap thresholds, disabled sides and automatic left-edge mirror work");
      window.CloseBubble(); window.Close(); restored.Close(); app.Shutdown();
      Emit(new { ok = true, checks = checks });
    }
  }
}
