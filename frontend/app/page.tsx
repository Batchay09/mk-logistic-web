import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Truck, Package, BarChart3, Shield, Clock, CheckCircle } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-[#D4512B] text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-[#EAC9B0] rounded-lg p-2">
            <Truck className="h-6 w-6 text-[#D4512B]" />
          </div>
          <span className="text-xl font-bold tracking-tight">МК ЛОГИСТИК</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="outline" className="border-white text-white hover:bg-white hover:text-[#D4512B] bg-transparent">
              Войти
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-white text-[#D4512B] hover:bg-[#EAC9B0] font-semibold">
              Регистрация
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#D4512B] to-[#B33D1A] text-white py-20 px-6 text-center">
        <Badge className="bg-[#EAC9B0] text-[#D4512B] mb-4 text-sm font-medium">
          Доставка на склады WB и Ozon
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
          Логистика для маркетплейсов<br />
          <span className="text-[#EAC9B0]">просто и удобно</span>
        </h1>
        <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
          Оформляйте заказы на доставку грузов на склады Wildberries и Ozon онлайн.
          Отслеживайте статусы, получайте стикеры и управляйте компанией в одном месте.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register">
            <Button size="lg" className="bg-white text-[#D4512B] hover:bg-[#EAC9B0] font-bold text-base px-8">
              Создать заказ
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 bg-transparent text-base px-8">
              Войти в кабинет
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-[#FBF0EA]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-[#1A1A1A] mb-10">Всё что нужно для доставки</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Package, title: "Удобное оформление", desc: "Мастер заказа в 6 шагов — маркетплейс, склад, дата, коробки, забор, оплата" },
              { icon: Clock, title: "Расписание доставки", desc: "Выбирайте дату из доступных слотов, система автоматически рассчитает дату прибытия" },
              { icon: BarChart3, title: "Контроль заказов", desc: "Отслеживайте статус каждого заказа: от оформления до доставки на склад" },
              { icon: CheckCircle, title: "Онлайн-оплата", desc: "Оплата через ЮKassa — банковская карта или СБП. Стикеры отправим автоматически" },
              { icon: Shield, title: "PDF стикеры", desc: "Стикеры 58×40мм с QR-кодом для каждой коробки — готовы сразу после оплаты" },
              { icon: Truck, title: "Забор груза", desc: "Нужен забор? Укажите адрес при оформлении — наш водитель приедет в срок" },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="border-[#EAC9B0] hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="bg-[#D4512B] rounded-lg p-2 w-10 h-10 flex items-center justify-center mb-3">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-[#1A1A1A] mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#D4512B] text-white py-14 px-6 text-center">
        <h2 className="text-2xl font-bold mb-3">Начните прямо сейчас</h2>
        <p className="text-white/80 mb-6">Регистрация занимает 1 минуту</p>
        <Link href="/register">
          <Button size="lg" className="bg-white text-[#D4512B] hover:bg-[#EAC9B0] font-bold px-10">
            Зарегистрироваться бесплатно
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-[#1A1A1A] text-white/60 py-6 px-6 text-center text-sm mt-auto">
        <p>© 2026 МК Логистик. Доставка на склады Wildberries и Ozon.</p>
      </footer>
    </div>
  )
}
