using System;
using System.Collections.Generic;
using System.Globalization;
using System.Web.Script.Serialization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Shapes;

namespace Cuigengji.Desktop {
  // Clicked-pet overview only. Charts, account corrections and model pricing
  // continue to open in the existing DSH Records page.
  public sealed partial class PetWindow {
    TextBlock quickDate, quickCalls, quickTokens, quickNotice, quickUnpriced;
    StackPanel quickCosts, quickBalances, quickAccounts;
    Expander quickCustom, quickWriting, quickToken, quickBalance;
    readonly Dictionary<Expander, Border> quickReveals = new Dictionary<Expander, Border>();
    Button quickRecords, quickPending, quickClose;
    readonly List<TextBlock> tokenCounts = new List<TextBlock>();
    bool writingExpanded;
    string costsSignature = "", balancesSignature = "", accountsSignature = "";
    static readonly bool Dark = ReadDarkMode();
    static bool ReadDarkMode() {
      try { return Convert.ToInt32(Microsoft.Win32.Registry.GetValue(@"HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize", "AppsUseLightTheme", 1)) == 0; } catch { return false; }
    }
    static Brush ColorBrush(string light, string dark) { return (Brush)new BrushConverter().ConvertFromString(Dark ? dark : light); }
    static Brush Paper { get { return ColorBrush("#FFFFFF", "#24242A"); } }
    static Brush Muted { get { return ColorBrush("#756F80", "#B0AAB9"); } }
    static Brush Line { get { return ColorBrush("#ECE9F0", "#3B3743"); } }
    static Brush Wash { get { return ColorBrush("#F6F3FA", "#302B38"); } }
    static Brush Accent { get { return ColorBrush("#79608E", "#C3A9DC"); } }
    static readonly ControlTemplate Disclosure = (ControlTemplate)System.Windows.Markup.XamlReader.Parse(@"
      <ControlTemplate xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation' TargetType='Expander'>
        <StackPanel>
          <ToggleButton Name='toggle' IsChecked='{Binding IsExpanded, RelativeSource={RelativeSource TemplatedParent}, Mode=TwoWay}' Foreground='{TemplateBinding Foreground}' HorizontalContentAlignment='Stretch' MinHeight='32' BorderThickness='1' Cursor='Hand'>
            <ToggleButton.Template><ControlTemplate TargetType='ToggleButton'>
              <Border Name='hit' Background='Transparent' BorderBrush='Transparent' BorderThickness='1' CornerRadius='7' Padding='0,4'>
                <Grid><Grid.ColumnDefinitions><ColumnDefinition/><ColumnDefinition Width='24'/></Grid.ColumnDefinitions>
                  <ContentPresenter Content='{TemplateBinding Content}' HorizontalAlignment='Stretch' VerticalAlignment='Center'/>
                  <Path Name='arrow' Grid.Column='1' Data='M 0,0 L 4,4 L 8,0' Stroke='{TemplateBinding Foreground}' StrokeThickness='1.5' StrokeStartLineCap='Round' StrokeEndLineCap='Round' Width='8' Height='4' HorizontalAlignment='Right' VerticalAlignment='Center' Margin='0,0,4,0' RenderTransformOrigin='.5,.5'><Path.RenderTransform><RotateTransform/></Path.RenderTransform></Path>
                </Grid>
              </Border>
              <ControlTemplate.Triggers>
                <Trigger Property='IsMouseOver' Value='True'><Setter TargetName='hit' Property='Background' Value='{DynamicResource PetHover}'/></Trigger>
                <Trigger Property='IsKeyboardFocused' Value='True'><Setter TargetName='hit' Property='BorderBrush' Value='{DynamicResource PetFocus}'/></Trigger>
              </ControlTemplate.Triggers>
            </ControlTemplate></ToggleButton.Template>
            <ContentPresenter ContentSource='Header'/>
          </ToggleButton>
          <Border Name='reveal' Height='0' ClipToBounds='True' Visibility='Collapsed'><ContentPresenter ContentSource='Content'/></Border>
        </StackPanel>
      </ControlTemplate>");
    Expander Fold(object header, object body, Border external = null) {
      var fold = new Expander { Header = header, Content = external == null ? body : null, Foreground = Muted, Template = Disclosure, HorizontalContentAlignment = HorizontalAlignment.Stretch };
      fold.Resources["PetHover"] = Wash; fold.Resources["PetFocus"] = Accent;
      if (external != null) { external.Child = (FrameworkElement)body; external.Height = 0; external.ClipToBounds = true; external.Visibility = Visibility.Collapsed; quickReveals[fold] = external; }
      fold.Expanded += delegate { AnimateDisclosure(fold, true); }; fold.Collapsed += delegate { AnimateDisclosure(fold, true); };
      fold.Loaded += delegate { AnimateDisclosure(fold, false); };
      return fold;
    }
    void AnimateDisclosure(Expander fold, bool animate) {
      fold.ApplyTemplate(); Border reveal;
      if (!quickReveals.TryGetValue(fold, out reveal)) reveal = fold.Template.FindName("reveal", fold) as Border;
      if (reveal == null) return;
      bool expanded = fold.IsExpanded; double from = reveal.ActualHeight;
      double fromOpacity = reveal.Visibility == Visibility.Visible ? reveal.Opacity : 0;
      reveal.BeginAnimation(FrameworkElement.HeightProperty, null); reveal.BeginAnimation(UIElement.OpacityProperty, null);
      var toggle = fold.Template.FindName("toggle", fold) as ToggleButton;
      if (toggle != null) {
        toggle.ApplyTemplate(); var arrow = toggle.Template.FindName("arrow", toggle) as Path;
        if (arrow != null) { var rotation = (RotateTransform)arrow.RenderTransform; if (rotation.IsFrozen) { rotation = rotation.CloneCurrentValue(); arrow.RenderTransform = rotation; } double angle = rotation.Angle; rotation.BeginAnimation(RotateTransform.AngleProperty, null); rotation.Angle = expanded ? 180 : 0;
          if (animate && !reduced && !headless && SystemParameters.ClientAreaAnimation) rotation.BeginAnimation(RotateTransform.AngleProperty, new DoubleAnimation(angle, rotation.Angle, TimeSpan.FromMilliseconds(180)) { EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut }, FillBehavior = FillBehavior.Stop });
        }
      }
      if (!animate || reduced || headless || !SystemParameters.ClientAreaAnimation) { reveal.Height = expanded ? Double.NaN : 0; reveal.Opacity = 1; reveal.Visibility = expanded ? Visibility.Visible : Visibility.Collapsed; return; }
      reveal.Visibility = Visibility.Visible;
      double contentWidth = fold.ActualWidth;
      if (quickReveals.ContainsKey(fold)) contentWidth = reveal.ActualWidth > 0 ? reveal.ActualWidth : bubbleScroll != null ? bubbleScroll.ActualWidth : contentWidth;
      if (reveal.Child != null) reveal.Child.Measure(new Size(Math.Max(80, contentWidth), Double.PositiveInfinity));
      double to = expanded && reveal.Child != null ? reveal.Child.DesiredSize.Height : 0;
      reveal.Height = to;
      var motion = new DoubleAnimation(from, to, TimeSpan.FromMilliseconds(180)) { EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut }, FillBehavior = FillBehavior.Stop };
      motion.Completed += delegate { if (fold.IsExpanded == expanded) { reveal.BeginAnimation(FrameworkElement.HeightProperty, null); reveal.BeginAnimation(UIElement.OpacityProperty, null); reveal.Height = expanded ? Double.NaN : 0; reveal.Visibility = expanded ? Visibility.Visible : Visibility.Collapsed; } };
      reveal.BeginAnimation(FrameworkElement.HeightProperty, motion);
      reveal.BeginAnimation(UIElement.OpacityProperty, new DoubleAnimation(fromOpacity, expanded ? 1 : 0, TimeSpan.FromMilliseconds(140)) { FillBehavior = FillBehavior.Stop });
    }
    static TextBlock Label(string text) { var block = Copy(text, 11); block.Foreground = Muted; block.Margin = new Thickness(0, 0, 0, 4); return block; }
    static Border Rule(double top) { return new Border { Height = 1, Background = Line, Margin = new Thickness(0, top, 0, 11) }; }
    static string Count(long value) { return value.ToString("N0", CultureInfo.GetCultureInfo("zh-CN")); }
    static string Currency(string amount, string currency) {
      decimal value;
      if (!Decimal.TryParse(amount, NumberStyles.AllowDecimalPoint | NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out value)) return "—";
      string symbol = currency == "CNY" ? "¥" : currency == "USD" ? "US$" : currency == "EUR" ? "€" : currency == "JPY" ? "JP¥" : currency == "GBP" ? "£" : currency;
      return symbol + " " + value.ToString("N2", CultureInfo.GetCultureInfo("zh-CN"));
    }
    void MoneyValues(StackPanel target, Dictionary<string, object> values, string empty, ref string signature) {
      string next = new JavaScriptSerializer().Serialize(values) + empty;
      if (next == signature) return; signature = next; target.Children.Clear();
      var keys = new List<string>(values.Keys); keys.Sort(delegate(string a, string b) { return a == b ? 0 : a == "CNY" ? -1 : b == "CNY" ? 1 : String.CompareOrdinal(a, b); });
      foreach (string currency in keys) { var text = Copy(Currency(Convert.ToString(values[currency], CultureInfo.InvariantCulture), currency), 22); text.FontWeight = FontWeights.Medium; text.Margin = new Thickness(0, 0, 0, 3); text.TextWrapping = TextWrapping.NoWrap; text.TextTrimming = TextTrimming.CharacterEllipsis; text.ToolTip = text.Text; target.Children.Add(text); }
      if (keys.Count == 0) { var text = Copy(empty, 16); text.Foreground = Muted; text.Margin = new Thickness(0, 3, 0, 4); target.Children.Add(text); }
      if (target.Tag == null) { target.Tag = "amounts"; target.SizeChanged += delegate { FitMoneyValues(target); }; }
      FitMoneyValues(target);
    }
    static void FitMoneyValues(StackPanel target) {
      if (target.ActualWidth <= 0) return;
      foreach (var child in target.Children) {
        var text = child as TextBlock; if (text == null || text.ToolTip == null) continue;
        var full = new FormattedText(text.Text, CultureInfo.GetCultureInfo("zh-CN"), FlowDirection.LeftToRight, new Typeface(text.FontFamily, text.FontStyle, text.FontWeight, text.FontStretch), 22, text.Foreground, VisualTreeHelper.GetDpi(target).PixelsPerDip);
        text.FontSize = Math.Max(11, Math.Min(22, 22 * target.ActualWidth / Math.Max(1, full.WidthIncludingTrailingWhitespace)));
      }
    }
    Grid WritingCells(string[] labels, string[] units) {
      var grid = new Grid(); grid.ColumnDefinitions.Add(new ColumnDefinition()); grid.ColumnDefinitions.Add(new ColumnDefinition());
      for (int i = 0; i < labels.Length; i++) {
        var cell = new StackPanel { Margin = new Thickness(i == 0 ? 0 : 8, 3, 0, 3) }; cell.Children.Add(Label(labels[i]));
        var row = new Grid(); row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) }); row.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        var value = Copy("—", 17); value.FontWeight = FontWeights.Medium; value.Margin = new Thickness(0); value.TextWrapping = TextWrapping.NoWrap; value.TextTrimming = TextTrimming.CharacterEllipsis; row.Children.Add(value); bubbleCounts.Add(value);
        var unit = Label(units[i]); unit.Margin = new Thickness(4, 0, 0, 0); unit.VerticalAlignment = VerticalAlignment.Center; unit.HorizontalAlignment = HorizontalAlignment.Left; Grid.SetColumn(unit, 1); row.Children.Add(unit); row.HorizontalAlignment = HorizontalAlignment.Left;
        cell.Children.Add(row); Grid.SetColumn(cell, i); grid.Children.Add(cell);
      }
      return grid;
    }
    FrameworkElement BuildQuickSummary() {
      costsSignature = balancesSignature = accountsSignature = ""; tokenCounts.Clear(); bubbleCounts.Clear(); quickReveals.Clear();
      var body = new StackPanel();
      var date = new DockPanel { Margin = new Thickness(0, 0, 0, 10) };
      quickCalls = Label(""); quickCalls.HorizontalAlignment = HorizontalAlignment.Right; DockPanel.SetDock(quickCalls, Dock.Right); date.Children.Add(quickCalls);
      quickDate = Label("今天"); date.Children.Add(quickDate); body.Children.Add(date);
      var tokenHeader = new StackPanel(); tokenHeader.Children.Add(Label("今日 Token")); quickTokens = Copy("—", 32); quickTokens.FontWeight = FontWeights.Medium; quickTokens.Margin = new Thickness(0); tokenHeader.Children.Add(quickTokens);
      var tokenBody = new StackPanel { Margin = new Thickness(0, 7, 0, 3) };
      foreach (string name in new[] { "未缓存输入", "缓存读取", "缓存写入", "输出" }) {
        var row = new DockPanel { Margin = new Thickness(0, 2, 0, 2) }; var value = Copy("—", 11); value.Margin = new Thickness(0); value.HorizontalAlignment = HorizontalAlignment.Right; DockPanel.SetDock(value, Dock.Right); row.Children.Add(value); row.Children.Add(Label(name)); tokenCounts.Add(value); tokenBody.Children.Add(row);
      }
      quickToken = Fold(tokenHeader, new Border { Background = Wash, CornerRadius = new CornerRadius(10), BorderBrush = Line, BorderThickness = new Thickness(1), Padding = new Thickness(10, 7, 10, 7), Margin = new Thickness(0, 8, 0, 0), Child = tokenBody });
      quickToken.Margin = new Thickness(0, 0, 0, 12); System.Windows.Automation.AutomationProperties.SetName(quickToken, "今日 Token 构成"); body.Children.Add(quickToken);
      var money = new Grid(); money.ColumnDefinitions.Add(new ColumnDefinition()); money.ColumnDefinitions.Add(new ColumnDefinition());
      var cost = new StackPanel(); cost.Children.Add(Label("今日花费  估算")); quickCosts = new StackPanel(); cost.Children.Add(quickCosts);
      var costBorder = new Border { Child = cost, BorderThickness = new Thickness(0, 0, 1, 0), BorderBrush = Line, Padding = new Thickness(0, 5, 10, 5), Margin = new Thickness(0, 0, 8, 0) }; money.Children.Add(costBorder);
      var balance = new StackPanel(); balance.Children.Add(Label("账户余额")); quickBalances = new StackPanel(); balance.Children.Add(quickBalances);
      quickAccounts = new StackPanel(); var accountReveal = new Border();
      quickBalance = Fold(balance, new Border { Child = quickAccounts, Background = Wash, BorderBrush = Line, BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(10), Padding = new Thickness(10), Margin = new Thickness(0, 8, 0, 0) }, accountReveal);
      quickBalance.Margin = new Thickness(8, 0, 0, 0); Grid.SetColumn(quickBalance, 1); money.Children.Add(quickBalance); System.Windows.Automation.AutomationProperties.SetName(quickBalance, "账户余额来源"); body.Children.Add(money); body.Children.Add(accountReveal);
      quickUnpriced = Label(""); quickUnpriced.Margin = new Thickness(0, 8, 0, 0); body.Children.Add(quickUnpriced);
      body.Children.Add(Rule(14));
      var heading = new Grid(); heading.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto }); heading.ColumnDefinitions.Add(new ColumnDefinition());
      var writingLabel = Copy("今日写作", 12); writingLabel.Margin = new Thickness(0); writingLabel.VerticalAlignment = VerticalAlignment.Center; heading.Children.Add(writingLabel);
      bubbleScope = Label("全部作品"); bubbleScope.Margin = new Thickness(12, 0, 0, 0); bubbleScope.HorizontalAlignment = HorizontalAlignment.Stretch; bubbleScope.TextAlignment = TextAlignment.Right; bubbleScope.VerticalAlignment = VerticalAlignment.Center; bubbleScope.TextTrimming = TextTrimming.CharacterEllipsis; bubbleScope.TextWrapping = TextWrapping.NoWrap; Grid.SetColumn(bubbleScope, 1); heading.Children.Add(bubbleScope);
      var mainWriting = WritingCells(new[] { "正文净增", "设定" }, new[] { "字", "字" });
      var writingReveal = new Border(); var extra = WritingCells(new[] { "规划修改", "作者聊天" }, new[] { "次", "字" }); extra.Margin = new Thickness(0, 9, 0, 0);
      quickWriting = Fold(heading, extra, writingReveal); quickWriting.IsExpanded = writingExpanded; quickWriting.Expanded += delegate { writingExpanded = true; }; quickWriting.Collapsed += delegate { writingExpanded = false; }; System.Windows.Automation.AutomationProperties.SetName(quickWriting, "今日写作数据"); body.Children.Add(quickWriting);
      body.Children.Add(mainWriting); body.Children.Add(writingReveal);
      quickNotice = Copy("", 12); quickNotice.Margin = new Thickness(0, 4, 0, 10); body.Children.Add(quickNotice);
      usagePanel = new StackPanel(); usageSignature = ""; var customBody = new StackPanel(); customBody.Children.Add(usagePanel); customBody.Children.Add(Action("换个气泡", delegate { Emit(new { type = "interact", kind = "next" }); })); quickCustom = Fold("自定义气泡", customBody); quickCustom.Margin = new Thickness(0, 3, 0, 9); body.Children.Add(quickCustom);
      quickPending = Action("回到待处理对话", delegate { string target = Text(Obj(Get(presentation, "notification")), "sessionId", ""); if (target.Length == 0) return; Emit(new { type = "conversation", sessionId = target }); CloseBubble(); OpenDSH(); }); body.Children.Add(quickPending);
      return body;
    }
    FrameworkElement BuildBubbleHeader() {
      var row = new Grid { Margin = new Thickness(16, 12, 16, 8) }; row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(28) }); row.ColumnDefinitions.Add(new ColumnDefinition()); row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(32) });
      row.Children.Add(new Border { Background = Wash, CornerRadius = new CornerRadius(9), Width = 28, Height = 28, Child = new Path { Data = Geometry.Parse("M 7,0 L 9,5 L 14,5.5 L 10,9 L 11,14 L 7,11.5 L 3,14 L 4,9 L 0,5.5 L 5,5 Z"), Stroke = Accent, StrokeThickness = 1.2, Width = 14, Height = 14, Stretch = Stretch.Uniform, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center } });
      bubbleTitle = Copy(RoleName, 14); bubbleTitle.Margin = new Thickness(8, 0, 0, 0); bubbleTitle.FontWeight = FontWeights.Medium; bubbleTitle.VerticalAlignment = VerticalAlignment.Center; Grid.SetColumn(bubbleTitle, 1); row.Children.Add(bubbleTitle);
      var close = Action("", CloseBubble); close.Content = new Path { Data = Geometry.Parse("M 0,0 L 8,8 M 8,0 L 0,8"), Stroke = Muted, StrokeThickness = 1.5, Width = 10, Height = 10, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center };
      close.Width = close.Height = 32; close.Margin = new Thickness(0); close.Padding = new Thickness(0); close.BorderBrush = Brushes.Transparent; close.Background = Brushes.Transparent; close.ToolTip = "收起速览"; System.Windows.Automation.AutomationProperties.SetName(close, "收起桌宠对话"); quickClose = close; Grid.SetColumn(close, 2); row.Children.Add(close); return row;
    }
    FrameworkElement BuildBubbleFooter() {
      quickRecords = Action("", delegate { Emit(new { type = "details", sessionId = sessionId }); CloseBubble(); OpenDSH(); });
      var row = new Grid(); row.ColumnDefinitions.Add(new ColumnDefinition()); row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(16) });
      var label = Copy("查看记录", 12); label.Foreground = Accent; label.Margin = new Thickness(0); label.VerticalAlignment = VerticalAlignment.Center; row.Children.Add(label);
      var arrow = new Path { Data = Geometry.Parse("M 0,8 L 8,0 M 1,0 L 8,0 L 8,7"), Stroke = Accent, StrokeThickness = 1.5, Width = 10, Height = 10, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center }; Grid.SetColumn(arrow, 1); row.Children.Add(arrow);
      quickRecords.Content = row; quickRecords.Margin = new Thickness(8, 4, 8, 4); quickRecords.Padding = new Thickness(8, 8, 8, 8); quickRecords.MinHeight = 36; quickRecords.BorderBrush = Brushes.Transparent; quickRecords.Background = Brushes.Transparent; quickRecords.HorizontalContentAlignment = HorizontalAlignment.Stretch; System.Windows.Automation.AutomationProperties.SetName(quickRecords, "查看记录");
      return new Border { Child = quickRecords, BorderBrush = Line, BorderThickness = new Thickness(0, 1, 0, 0) };
    }
    static void OpenDSH() { try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("dsh://open") { UseShellExecute = true }); } catch { } }
    void RefreshQuickSummary() {
      if (quickTokens == null || bubble == null || menuOpen) return;
      var summary = Obj(Get(presentation, "summary")); bool hasSummary = Get(presentation, "summary") != null;
      string day = Text(summary, "date", Text(activity, "date", "")); DateTime parsed;
      quickDate.Text = DateTime.TryParseExact(day, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out parsed) ? "今天 · " + parsed.Month + "月" + parsed.Day + "日" : "今天";
      quickCalls.Text = Get(summary, "calls") == null ? "" : Count(Number(summary, "calls")) + " 次调用"; quickTokens.Text = hasSummary ? Count(Number(summary, "tokens")) : "—";
      string[] tokens = { "input", "cacheRead", "cacheWrite", "output" };
      for (int i = 0; i < tokens.Length; i++) tokenCounts[i].Text = Get(summary, tokens[i]) == null ? "—" : Count(Number(summary, tokens[i]));
      var costs = Obj(Get(summary, "costs")); long calls = Number(summary, "calls"), unpriced = Number(summary, "unpriced"); string currency = Text(summary, "currency", "CNY");
      if (Get(summary, "costs") == null && hasSummary && (calls == 0 || unpriced < calls)) costs[currency] = Text(summary, "cost", "0");
      if (hasSummary && Get(summary, "calls") != null && calls == 0) costs[currency] = "0";
      MoneyValues(quickCosts, costs, hasSummary ? "未定价" : "—", ref costsSignature); MoneyValues(quickBalances, Obj(Get(summary, "balanceTotals")), "未连接", ref balancesSignature);
      quickUnpriced.Text = Count(unpriced) + " 次调用未定价"; quickUnpriced.Visibility = unpriced > 0 ? Visibility.Visible : Visibility.Collapsed;
      string nextAccounts = new JavaScriptSerializer().Serialize(Get(summary, "balances"));
      if (nextAccounts != accountsSignature) {
        accountsSignature = nextAccounts; quickAccounts.Children.Clear(); var accounts = Get(summary, "balances") as object[];
        if (accounts != null) foreach (var item in accounts) {
          var account = Obj(item); var row = new StackPanel { Margin = new Thickness(0, 0, 0, 7) }; row.Children.Add(Label(Text(account, "name", "账户")));
          var raw = Get(account, "balance"); var value = Copy(raw == null ? "未连接" : Currency(Convert.ToString(raw, CultureInfo.InvariantCulture), Text(account, "currency", currency)), 12); value.Margin = new Thickness(0, 0, 0, 2); row.Children.Add(value);
          string issue = Text(account, "error", ""); if (issue.Length > 0) row.Children.Add(Label(raw == null ? issue : "余额暂未更新"));
          else if (Get(account, "at") != null) try { row.Children.Add(Label(new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddMilliseconds(Convert.ToDouble(Get(account, "at"), CultureInfo.InvariantCulture)).ToLocalTime().ToString("HH:mm") + " 查询")); } catch { }
          quickAccounts.Children.Add(row);
        }
        if (quickAccounts.Children.Count == 0) quickAccounts.Children.Add(Label("尚无余额数据"));
        long remaining = Number(summary, "balanceCount") - (accounts == null ? 0 : accounts.Length); if (remaining > 0) quickAccounts.Children.Add(Label("另有 " + remaining + " 个账户"));
      }
      bubbleScope.Text = error.Length > 0 ? "进度暂未连接" : activity == null ? (sessionId.Length == 0 ? "打开一个对话" : "正在读取…") : Text(activity, "title", "全部作品"); bubbleScope.ToolTip = error.Length > 0 ? error : bubbleScope.Text;
      var stats = Obj(Get(activity, "stats")); string[] fields = { "proseAdded", "settingAdded", "planningChanges", "conversationInput" };
      for (int i = 0; i < fields.Length; i++) { long value = Number(stats, fields[i]); bubbleCounts[i].Text = activity == null ? "—" : (i == 0 && value > 0 ? "+" : "") + Count(value); }
      var notice = Obj(Get(presentation, "notification")); quickNotice.Text = Text(notice, "text", ""); quickNotice.Visibility = quickNotice.Text.Length > 0 ? Visibility.Visible : Visibility.Collapsed;
      quickPending.Visibility = Flag(notice, "pending", false) && Text(notice, "sessionId", "").Length > 0 ? Visibility.Visible : Visibility.Collapsed;
      quickRecords.IsEnabled = sessionId.Length > 0;
      quickCustom.Header = Text(presentation, "bubbleName", "自定义气泡"); quickCustom.Visibility = Flag(presentation, "customContent", !hasSummary) ? Visibility.Visible : Visibility.Collapsed;
    }
  }
}
