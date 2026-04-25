import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Truck, Package, BarChart3, Shield, Clock, CheckCircle } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#EAC9B0] sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/brand/logo-mk-logistik.jpg"
            alt="МК Логистик"
            width={36}
            height={36}
            className="rounded-md"
            priority
          />
          <span className="text-base sm:text-lg font-bold tracking-tight text-[#1A1A1A]">МК ЛОГИСТИК</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login">
            <Button variant="ghost" className="hover:text-[#D4512B] hover:bg-[#FBF0EA]">
              Войти
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-[#D4512B] hover:bg-[#B33D1A] text-white font-medium">
              Регистрация
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        className="text-white py-16 sm:py-20 px-6"
        style={{ background: "linear-gradient(180deg, #D4512B 0%, #B33D1A 100%)" }}
      >
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div className="text-center lg:text-left">
            <Badge className="bg-white/15 text-white mb-4 text-sm font-medium border-0 backdrop-blur-sm">
              Доставка на склады WB и Ozon
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-[1.1] tracking-tight">
              Логистика для маркетплейсов<br />
              <span className="text-[#EAC9B0]">просто и удобно</span>
            </h1>
            <p className="text-base sm:text-lg text-white/85 mb-7 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Оформляйте заказы на доставку грузов на склады Wildberries и Ozon онлайн.
              Отслеживайте статусы, получайте стикеры и управляйте компанией в одном месте.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link href="/register">
                <Button size="lg" className="bg-white text-[#D4512B] hover:bg-[#FBF0EA] font-bold text-base px-7">
                  Создать заказ
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/15 bg-transparent text-base px-7">
                  Войти в кабинет
                </Button>
              </Link>
            </div>
          </div>
          <div className="hidden lg:flex justify-center">
            <Image
              src="/brand/illustration-warehouse.svg"
              alt=""
              width={520}
              height={290}
              className="rounded-2xl shadow-xl"
              priority
            />
          </div>
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
              <Card key={title} className="border-[#EAC9B0] hover:shadow-md transition-shadow rounded-xl">
                <CardContent className="pt-6">
                  <div className="bg-[#FBF0EA] rounded-lg p-2 w-10 h-10 flex items-center justify-center mb-3">
                    <Icon className="h-5 w-5 text-[#D4512B]" />
                  </div>
                  <h3 className="font-semibold text-[#1A1A1A] mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
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
