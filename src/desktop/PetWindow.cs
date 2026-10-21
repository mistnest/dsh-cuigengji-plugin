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
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Effects;
using System.Windows.Media.Imaging;
using System.Windows.Threading;

namespace Cuigengji.Desktop {
  public sealed class PetWindow : Window {
    readonly string stateDirectory;
    readonly Dictionary<string, BitmapSource> sheets = new Dictionary<string, BitmapSource>();
    readonly Image art = new Image { Width = 128, Height = 128, Stretch = Stretch.Uniform, Cursor = Cursors.Hand };
    readonly Canvas canvas = new Canvas { Width = 148, Height = 148 };
    readonly TranslateTransform bob = new TranslateTransform();
    readonly DispatcherTimer timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(500) };
    Dictionary<string, object> activity;
    Window bubble;
    TextBlock bubbleTitle, bubbleScope, bubbleMessage;
    readonly List<TextBlock> bubbleCounts = new List<TextBlock>();
    string role = "bigfish", mood = "idle", sessionId = "", error = "";
    bool reduced, dragging, moved, headless, shuttingDown, menuOpen;
    Point dragOrigin, windowOrigin;
    DateTime reactionUntil = DateTime.MinValue, celebrationUntil = DateTime.MinValue;
    int parentId;
    long previousTotal = -1;
    string previousScope = "", renderedPose = "";
    static readonly Encoding Utf8 = new UTF8Encoding(false);
    static readonly ControlTemplate RoundedButton = (ControlTemplate)System.Windows.Markup.XamlReader.Parse(@"<ControlTemplate xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation' TargetType='Button'><Border Name='paper' Background='{TemplateBinding Background}' BorderBrush='{TemplateBinding BorderBrush}' BorderThickness='{TemplateBinding BorderThickness}' CornerRadius='8'><ContentPresenter Margin='{TemplateBinding Padding}' HorizontalAlignment='{TemplateBinding HorizontalContentAlignment}' VerticalAlignment='Center'/></Border><ControlTemplate.Triggers><Trigger Property='IsMouseOver' Value='True'><Setter TargetName='paper' Property='Background' Value='#F2F6FF'/></Trigger><Trigger Property='IsKeyboardFocused' Value='True'><Setter TargetName='paper' Property='BorderBrush' Value='#416DEA'/></Trigger><Trigger Property='IsEnabled' Value='False'><Setter TargetName='paper' Property='Opacity' Value='.5'/></Trigger></ControlTemplate.Triggers></ControlTemplate>");
    static Dictionary<string, object> Obj(object value) { return value as Dictionary<string, object> ?? new Dictionary<string, object>(); }
    static object Get(Dictionary<string, object> row, string key) { object value; return row != null && row.TryGetValue(key, out value) ? value : null; }
    static string Text(Dictionary<string, object> row, string key, string fallback) { return Get(row, key) as string ?? fallback; }
    static long Number(Dictionary<string, object> row, string key) { try { return Math.Max(0, Convert.ToInt64(Get(row, key), CultureInfo.InvariantCulture)); } catch { return 0; } }
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
      art.MouseLeftButtonDown += delegate(object sender, MouseButtonEventArgs e) { dragging = true; moved = false; dragOrigin = ScreenPoint(); windowOrigin = new Point(Left, Top); art.CaptureMouse(); e.Handled = true; };
      art.MouseMove += delegate { if (dragging) MoveTo(ScreenPoint()); };
      art.MouseLeftButtonUp += delegate(object sender, MouseButtonEventArgs e) {
        if (!dragging) return; dragging = false; art.ReleaseMouseCapture();
        if (moved) { ClampToMonitor(); SavePosition(); } else { reactionUntil = DateTime.UtcNow.AddSeconds(1.7); UpdateArt(); ToggleBubble(false); }
        e.Handled = true;
      };
      art.LostMouseCapture += delegate { if (dragging) { dragging = false; if (moved) { ClampToMonitor(); SavePosition(); } } };
      art.MouseRightButtonUp += delegate(object sender, MouseButtonEventArgs e) { dragging = false; art.ReleaseMouseCapture(); ToggleBubble(true); e.Handled = true; };
      PreviewKeyDown += delegate(object sender, KeyEventArgs e) { if (e.Key == Key.Escape) { CloseBubble(); e.Handled = true; } };
      LocationChanged += delegate { if (bubble != null) PositionBubble(); };
      Closed += delegate { shuttingDown = true; timer.Stop(); CloseBubble(); };
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
      BitmapSource sheet = sheets[role]; int columns = role == "bigfish" ? 3 : 2, size = sheet.PixelWidth / columns, pose = Pose(current);
      var crop = new CroppedBitmap(sheet, new Int32Rect((pose % columns) * size, (pose / columns) * size, size, size)); crop.Freeze(); art.Source = crop;
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
      if (headless) Emit(new { type = "test-state", role = role, title = Text(activity, "title", ""), mood = CurrentMood(), visible = Flag(update, "visible", true) });
    }
    static Brush Ink { get { return new SolidColorBrush(Color.FromRgb(40, 53, 79)); } }
    static TextBlock Copy(string text, double size) { return new TextBlock { Text = text, FontSize = size, Foreground = Ink, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 0, 0, 8) }; }
    Button Action(string text, Action action) {
      var button = new Button { Content = text, FontSize = 12, Padding = new Thickness(10, 7, 10, 7), Margin = new Thickness(0, 3, 0, 3), Background = Brushes.White, Foreground = Ink, BorderBrush = new SolidColorBrush(Color.FromRgb(220, 229, 247)), BorderThickness = new Thickness(1), HorizontalContentAlignment = HorizontalAlignment.Center };
      button.Template = RoundedButton; button.Click += delegate { action(); }; return button;
    }
    void Preference(bool visible, string nextRole) { role = nextRole; Emit(new { type = "preferences", role = role, visible = visible }); UpdateArt(); if (!visible) { CloseBubble(); Hide(); } }
    string Message() {
      string current = CurrentMood();
      if (current == "error") return "暂时读不到进度，已保存的作品不受影响。";
      if (current == "waiting") return "AI 有一步需要你回应，去对话里看看吧。";
      if (current == "writing") return "AI 正在工作，我陪你一起等它。";
      if (current == "reacting") return "在呢，陪你把下一段故事写好。";
      if (current == "celebrate") return "又保存了新进展，给你一颗小星星！";
      if (current == "sleepy") return "夜深了，先记下这个念头，明天接着写。";
      long prose = Number(Obj(Get(activity, "stats")), "proseAdded");
      if (prose > 0) return "今天已写下 " + prose.ToString("N0", CultureInfo.GetCultureInfo("zh-CN")) + " 字正文，一点点把故事变完整。";
      return "从一句开始也很好，我在这里陪着你。";
    }
    void ToggleBubble(bool menu) { if (bubble != null && menuOpen == menu) { CloseBubble(); return; } CloseBubble(); RebuildBubble(menu); }
    void RebuildBubble(bool menu) {
      menuOpen = menu;
      if (bubble == null) {
        bubble = new Window { Title = "催更姬写作陪伴", Width = 280, SizeToContent = SizeToContent.Height, WindowStyle = WindowStyle.None, AllowsTransparency = true, Background = Brushes.Transparent, ShowInTaskbar = false, ResizeMode = ResizeMode.NoResize, Topmost = true, ShowActivated = true };
        bubble.Deactivated += delegate { CloseBubble(); };
        bubble.SizeChanged += delegate { PositionBubble(); };
        bubble.PreviewKeyDown += delegate(object sender, KeyEventArgs e) { if (e.Key == Key.Escape) CloseBubble(); };
      }
      var content = new StackPanel(); var header = new DockPanel(); var close = Action("×", CloseBubble); close.Padding = new Thickness(5, 0, 5, 0); DockPanel.SetDock(close, Dock.Right); header.Children.Add(close); bubbleTitle = Copy(RoleName, 15); header.Children.Add(bubbleTitle); content.Children.Add(header);
      if (menu) {
        content.Children.Add(Action("切换为" + (role == "bigfish" ? "催更姬" : "大肥鱼"), delegate { Preference(true, role == "bigfish" ? "cuigengji" : "bigfish"); CloseBubble(); }));
        content.Children.Add(Action("回到屏幕右下角", delegate { ResetPosition(); CloseBubble(); }));
        content.Children.Add(Action("暂时隐藏", delegate { Preference(false, role); }));
      } else {
        bubbleScope = Copy("", 11); bubbleScope.Opacity = .6; content.Children.Add(bubbleScope);
        bubbleMessage = Copy(Message(), 12); content.Children.Add(bubbleMessage); bubbleCounts.Clear();
        var stats = Obj(Get(activity, "stats")); var grid = new Grid();
        string[] fields = { "proseAdded", "settingAdded", "planningChanges" }, labels = { "正文", "设定", "规划" };
        for (int i = 0; i < 3; i++) {
          grid.ColumnDefinitions.Add(new ColumnDefinition()); var cell = new StackPanel { Margin = new Thickness(3), Background = new SolidColorBrush(Color.FromRgb(244, 247, 253)) };
          var label = Copy(labels[i], 11); label.HorizontalAlignment = HorizontalAlignment.Center; label.Margin = new Thickness(0, 7, 0, 3); cell.Children.Add(label);
          var count = Copy(activity == null ? "—" : Number(stats, fields[i]).ToString("N0", CultureInfo.GetCultureInfo("zh-CN")), 17); count.HorizontalAlignment = HorizontalAlignment.Center; cell.Children.Add(count); bubbleCounts.Add(count);
          var unit = Copy(i == 2 ? "次" : "字", 10); unit.HorizontalAlignment = HorizontalAlignment.Center; cell.Children.Add(unit);
          var card = new Border { Child = cell, Background = cell.Background, CornerRadius = new CornerRadius(9), Margin = new Thickness(2) }; cell.Background = null; Grid.SetColumn(card, i); grid.Children.Add(card);
        }
        content.Children.Add(grid);
        content.Children.Add(Action("查看详情", delegate { Emit(new { type = "details", sessionId = sessionId }); CloseBubble(); try { Process.Start(new ProcessStartInfo("dsh://open") { UseShellExecute = true }); } catch { } }));
      }
      var scroll = new ScrollViewer { Content = content, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled, MaxHeight = Math.Max(100, WorkArea().Height - 64) };
      bubble.Content = new Border { Child = scroll, Background = Brushes.White, BorderBrush = new SolidColorBrush(Color.FromRgb(222, 230, 246)), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(16), Padding = new Thickness(16), Margin = new Thickness(3) };
      RefreshBubbleText();
      bubble.Measure(new Size(280, Double.PositiveInfinity)); bubble.Arrange(new Rect(0, 0, 280, bubble.DesiredSize.Height));
      PositionBubble(); if (!headless && !bubble.IsVisible) bubble.Show();
    }
    void RefreshBubbleText() {
      if (bubble == null || menuOpen || bubbleScope == null || bubbleCounts.Count != 3) return;
      bubbleTitle.Text = RoleName;
      bubbleScope.Text = activity == null ? "正在读取今日进度…" : Text(activity, "title", "全部作品") + " · 今日进度";
      bubbleMessage.Text = Message();
      string[] fields = { "proseAdded", "settingAdded", "planningChanges" }; var stats = Obj(Get(activity, "stats"));
      for (int i = 0; i < 3; i++) bubbleCounts[i].Text = activity == null ? "—" : Number(stats, fields[i]).ToString("N0", CultureInfo.GetCultureInfo("zh-CN"));
    }
    void PositionBubble() {
      if (bubble == null) return; Rect area = WorkArea(); double height = Math.Max(160, bubble.ActualHeight > 0 ? bubble.ActualHeight : bubble.DesiredSize.Height), x = Left - 282, y = Top + Height - height;
      if (x < area.Left + 8) x = Left + Width + 4;
      if (x + 280 > area.Right - 8) { x = Left + (Width - 280) / 2; y = Top - height - 4; }
      bubble.Left = Clamp(x, area.Left + 8, area.Right - 288); bubble.Top = Clamp(y, area.Top + 8, area.Bottom - height - 8);
    }
    void CloseBubble() { if (bubble == null) return; Window previous = bubble; bubble = null; previous.Close(); }
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
      window.Apply(Obj(new JavaScriptSerializer().DeserializeObject("{\"type\":\"update\",\"role\":\"cuigengji\",\"reduced\":true,\"activity\":{\"date\":\"2026-10-18\",\"novelId\":\"test\",\"title\":\"桌宠验收作品\",\"stats\":{\"proseAdded\":1234,\"settingAdded\":120,\"planningChanges\":3}}}")));
      window.RebuildBubble(false); var visual = (FrameworkElement)window.bubble.Content; var previousCount = window.bubbleCounts[0];
      Obj(Get(window.activity, "stats"))["proseAdded"] = 1235; window.RefreshBubbleText();
      if (window.bubble.Content != visual || window.bubbleCounts[0] != previousCount || previousCount.Text != "1,235") throw new Exception("Progress refresh replaced the active bubble controls");
      Obj(Get(window.activity, "stats"))["proseAdded"] = 1234; window.RefreshBubbleText();
      visual.Measure(new Size(280, 600)); visual.Arrange(new Rect(0, 0, 280, visual.DesiredSize.Height));
      var shot = new RenderTargetBitmap(280, (int)Math.Ceiling(visual.ActualHeight), 96, 96, PixelFormats.Pbgra32); shot.Render(visual); var png = new PngBitmapEncoder(); png.Frames.Add(BitmapFrame.Create(shot)); using (var file = File.Create(Path.Combine(output, "native-bubble.png"))) png.Save(file);
      checks.Add("native progress bubble renders without showing a desktop window");
      window.CloseBubble(); window.Close(); restored.Close(); app.Shutdown();
      Emit(new { ok = true, checks = checks });
    }
  }
}
